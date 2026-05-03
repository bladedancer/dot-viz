import { NodeProgram } from 'sigma/rendering';

const FLOAT = WebGLRenderingContext.FLOAT;
const UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE;

// floatColor is not a public sigma/rendering export — re-implement the same packing
const _int8 = new Int8Array(4);
const _int32 = new Int32Array(_int8.buffer, 0, 1);
const _float32 = new Float32Array(_int8.buffer, 0, 1);
function floatColor(hex) {
    let r = 0, g = 0, b = 0;
    if (hex && hex[0] === '#') {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    _int32[0] = (0xfe << 24) | (b << 16) | (g << 8) | r; // alpha=254 masking
    return _float32[0];
}

const VERT = /* glsl */`
attribute vec2 a_position;
attribute float a_nodeW;
attribute float a_nodeH;
attribute vec4 a_color;
attribute float a_isRoot;
attribute float a_highlighted;
attribute vec4 a_id;
attribute vec2 a_corner;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;

varying vec4 v_color;
varying vec2 v_uv;
varying float v_isRoot;
varying float v_highlighted;
varying float v_w;
varying float v_h;
varying float v_correctionRatio;

const float bias = 255.0 / 254.0;

void main() {
    float w = a_nodeW * u_correctionRatio / u_sizeRatio * 0.5;
    float h = a_nodeH * u_correctionRatio / u_sizeRatio * 0.5;

    vec2 offset = vec2(a_corner.x * w, a_corner.y * h);
    vec2 worldPos = a_position + offset;
    gl_Position = vec4((u_matrix * vec3(worldPos, 1.0)).xy, 0.0, 1.0);

    v_uv = a_corner;
    v_w = w;
    v_h = h;
    v_isRoot = a_isRoot;
    v_highlighted = a_highlighted;
    v_correctionRatio = u_correctionRatio;

    #ifdef PICKING_MODE
    v_color = a_id;
    #else
    v_color = a_color;
    #endif

    v_color.a *= bias;
}
`;

const FRAG = /* glsl */`
precision mediump float;

varying vec4 v_color;
varying vec2 v_uv;
varying float v_isRoot;
varying float v_highlighted;
varying float v_w;
varying float v_h;
varying float v_correctionRatio;

float roundedBoxSDF(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
    vec2 pos      = v_uv * vec2(v_w, v_h);
    vec2 halfSize = vec2(v_w, v_h);
    float r = min(v_w, v_h) * 0.35;
    r = min(r, 6.0 * v_correctionRatio);

    float border = v_correctionRatio * 2.0;
    float d = roundedBoxSDF(pos, halfSize, r);

    #ifdef PICKING_MODE
    if (d > 0.0) discard;
    gl_FragColor = v_color;
    return;
    #endif

    if (d > border) discard;
    float alpha = 1.0 - smoothstep(-border, 0.0, d);

    vec3 col = v_color.rgb;
    if (v_highlighted > 0.5) col = min(col * 1.6, vec3(1.0));

    if (v_isRoot > 0.5) {
        float borderWidth = 2.5 * v_correctionRatio;
        float innerD = roundedBoxSDF(pos, halfSize - borderWidth, r - borderWidth);
        float outerAlpha = alpha;
        float innerAlpha = 1.0 - smoothstep(-border, 0.0, innerD);
        float ring = outerAlpha - innerAlpha;
        if (ring > 0.05) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, ring);
            return;
        }
        alpha = innerAlpha;
    }

    gl_FragColor = vec4(col, v_color.a * alpha);
}
`;

const UNIFORMS = ['u_sizeRatio', 'u_correctionRatio', 'u_matrix'];

export default class RoundedRectProgram extends NodeProgram {
    getDefinition() {
        return {
            VERTICES: 4,
            VERTEX_SHADER_SOURCE: VERT,
            FRAGMENT_SHADER_SOURCE: FRAG,
            METHOD: WebGLRenderingContext.TRIANGLE_STRIP,
            UNIFORMS,
            ATTRIBUTES: [
                { name: 'a_position',    size: 2, type: FLOAT },
                { name: 'a_nodeW',       size: 1, type: FLOAT },
                { name: 'a_nodeH',       size: 1, type: FLOAT },
                { name: 'a_color',       size: 4, type: UNSIGNED_BYTE, normalized: true },
                { name: 'a_isRoot',      size: 1, type: FLOAT },
                { name: 'a_highlighted', size: 1, type: FLOAT },
                { name: 'a_id',          size: 4, type: UNSIGNED_BYTE, normalized: true },
            ],
            CONSTANT_ATTRIBUTES: [
                { name: 'a_corner', size: 2, type: FLOAT },
            ],
            // TRIANGLE_STRIP with 4 corners: BL, BR, TL, TR
            CONSTANT_DATA: [
                [-1, -1],
                [ 1, -1],
                [-1,  1],
                [ 1,  1],
            ],
        };
    }

    processVisibleItem(nodeIndex, startIndex, data) {
        const arr = this.array;
        let i = startIndex;
        arr[i++] = data.x;
        arr[i++] = data.y;
        arr[i++] = data.labelWidth  ?? 80;
        arr[i++] = data.labelHeight ?? 24;
        arr[i++] = floatColor(data.color || '#888888');
        arr[i++] = data.root        ? 1.0 : 0.0;
        arr[i++] = data.highlighted ? 1.0 : 0.0;
        arr[i++] = nodeIndex; // packed picking id (from indexToColor)
    }

    setUniforms(params, { gl, uniformLocations }) {
        const { u_sizeRatio, u_correctionRatio, u_matrix } = uniformLocations;
        gl.uniform1f(u_sizeRatio,      params.sizeRatio);
        gl.uniform1f(u_correctionRatio, params.correctionRatio);
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
    }

    // Sigma calls drawLabel on the program instance for nodes of this type
    drawLabel(context, data, settings) {
        if (!data.label) return;
        const size = settings.labelSize || 12;
        context.font = `${settings.labelWeight || '400'} ${size}px ${settings.labelFont || 'monospace'}`;
        context.fillStyle = (settings.labelColor && settings.labelColor.color) || '#c9d1d9';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(data.label, data.x, data.y);
    }

    // WebGL layer handles the highlight (brightened color); just redraw the label
    // on the hover canvas layer so it appears above the node box.
    drawHover(context, data, settings) {
        this.drawLabel(context, data, settings);
    }
}
