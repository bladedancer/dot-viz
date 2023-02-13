import React, { useState, useEffect, useMemo } from "react";
import chroma from "chroma-js";
import { JSONPath } from "jsonpath-plus";
import Graph from "./Graph.jsx";
import { useSettingsContext, useSetSourceRefresh } from "../hooks/useSettings.js";
import ControlsContainer from "./controls/ControlsContainer.jsx";
import LayoutControl from "./controls/LayoutControl.jsx";
import SourceControl from "./controls/SourceControl.jsx";
import FilterControl from "./controls/FilterControl.jsx";
import ZoomControl from "./controls/ZoomControl.jsx";
import ExportControl from "./controls/ExportControl.jsx";
import FedControl from "./controls/FedControl.jsx";

const LINK_TYPE_SCOPE = "scope";
const LINK_TYPE_HARD = "hard";
const LINK_TYPE_SOFT = "soft";

function references(scopes, def) {
  let targets = new Set();

  def.versions.forEach((ver) => {
    // For each version spec find the refs and create links
    let refs = JSONPath({
      path: "$..'x-amplify-kind-ref'",
      json: ver,
      resultType: "parent",
    });

    if (!refs || refs.length === 0) {
      return;
    }

    // Add reference links
    refs.forEach((ref) => {
      let targetRef = ref["x-amplify-kind-ref"];
      let refType = ref["x-amplify-kind-ref-type"] || "hard";

      // For now not rendering dynamic refs.
      if (targetRef.startsWith("../")) {
        return;
      }

      let targetRefParts = targetRef.split("/");
      let group;
      let scope;
      let targetName;

      if (targetRefParts.length === 1) {
        group = def.resource.metadata.scope.name; // Same group
        scope = scopes.includes(targetRefParts[0])
          ? null
          : def.resource.spec.scope.kind; // If not targetting scope then same scope
        targetName = targetRefParts[0];
      } else if (targetRefParts.length === 2) {
        if (targetRefParts[0] === targetRefParts[0].toLowerCase()) {
          // Lower case is group/Kind
          group = targetRefParts[0];
          scope = null;
          targetName = targetRefParts[1];
        } else {
          // Otherwise it's Scope/Kind
          group = def.resource.metadata.scope.name; // Same group
          scope = targetRefParts[0];
          targetName = targetRefParts[1];
        }
      } else if (targetRefParts.length === 3) {
        group = targetRefParts[0];
        scope = targetRefParts[1];
        targetName = targetRefParts[2];
      }

      targets.add({
        group,
        scope,
        kind: targetName,
        type: refType,
        sourceVersion: ver.spec.name,
      });
    });
  });

  return targets;
}

function color(index, domain) {
  //return chroma.cubehelix().lightness([0.3,0.7]).scale().colors(domain)[index];
  return chroma(chroma.scale("Spectral").colors(domain)[index]).darken().hex();
  //return chroma.scale(['yellow', 'navy']).mode('lch').colors(domain)[index];
}

function nodify(graph, source) {
  let data = {
    source,
    nodes: [],
    scopes: [],
  };

  if (source === "definitions") {
    data = {...data, ...nodifyDefinitions(graph.definitions)};
  } else if (source === "instances") {
    data = {...data, ...nodifyInstances(graph.instances)};
  }

  return data;
}

function nodifyDefinitions(definitions) {
  let scopeNames = Object.values(definitions)
    .filter((def) => !def.resource.spec.scope)
    .sort(
      (a, b) =>
        a.resource.metadata.scope.name.localeCompare(
          b.resource.metadata.scope.name
        ) || a.resource.spec.kind.localeCompare(b.resource.spec.kind)
    )
    .map((def) => def.resource.spec.kind);

  let nodes = Object.values(definitions).map((def) => {
    const isScope = !def.resource.spec.scope;
    return {
      id: def.resource.metadata.id,
      group: def.resource.metadata.scope.name,
      kind: def.resource.spec.kind,
      isScope,
      scope: isScope ? null : { name: def.resource.spec.scope.kind },
      size: isScope ? 10 : 5,
      links: [],
      references: references(scopeNames, def),
      color: isScope
        ? color(scopeNames.indexOf(def.resource.spec.kind), scopeNames.length)
        : color(
            scopeNames.indexOf(def.resource.spec.scope.kind),
            scopeNames.length
          ),
    };
  });

  // Resolve the scope ids.
  let scopes = nodes.filter((n) => n.isScope);
  let scopeIds = scopes.reduce((acc, n) => {
    acc[n.kind] = n.id;
    return acc;
  }, {});

  nodes
    .filter((n) => !n.isScope)
    .forEach((n) => {
      n.scope.id = scopeIds[n.scope.name];
    });

  // Node links
  nodes.forEach((n) => {
    if (!n.isScope) {
      n.links.push({
        source: n.id,
        target: n.scope.id,
        refType: LINK_TYPE_SCOPE,
        size: 1,
        type: "line",
        color: chroma(n.color).alpha(0.5).hex(),
        weight: 10,
      });
    }

    // hard/soft (todo filtering)
    n.references.forEach((ref) => {
      let targetNode = nodes.find(
        (t) =>
          ref.kind === t.kind &&
          ref.group === t.group &&
          ref.scope === (t.scope ? t.scope.name : null)
      );

      n.links.push({
        source: n.id,
        target: targetNode.id,
        refType: ref.type,
        size: ref.type === LINK_TYPE_HARD ? 3 : 2,
        weight: ref.type === LINK_TYPE_HARD ? 5 : 1,
        label: "",
        type: "arrow",
        color: chroma(targetNode.color).alpha(0.5).hex(),
      });
    });
  });

  return {
    nodes,
    scopes,
  };
}

function nodifyInstances(instances) {
  const scopes = instances
    .filter((i) => !i.metadata.scope)
    .sort(
      (a, b) =>
        a.group.localeCompare(b.group) ||
        a.name.localeCompare(b.name) ||
        a.kind.localeCompare(b.kind)
    );

  let nodes = instances.map((inst) => {
    const isScope = !inst.metadata.scope;

    return {
      id: inst.metadata.id,
      group: inst.group,
      kind: inst.kind,
      name: inst.name,
      hasFinalizer: inst.finalizers && inst.finalizers.length > 0,
      isScope,
      scope: isScope
        ? null
        : {
            name: inst.metadata.scope.name,
            id: inst.metadata.scope.id,
          },
      size: isScope ? 10 : 5,
      links: [],
      references: [], // todo
      color: isScope
        ? color(
            scopes.findIndex((s) => s.metadata.id == inst.metadata.id),
            scopes.length
          )
        : color(
            scopes.findIndex((s) => s.metadata.id == inst.metadata.scope.id),
            scopes.length
          ),
    };
  });

  // Node links
  nodes.forEach((n) => {
    if (!n.isScope) {
      n.links.push({
        source: n.id,
        target: n.scope.id,
        refType: LINK_TYPE_SCOPE,
        size: 1,
        type: "line",
        color: chroma(n.color).alpha(0.5).hex(),
        weight: 10,
      });
    }

    // hard/soft (todo filtering)
    instances
      .find((inst) => n.id === inst.metadata.id)
      .metadata.references.forEach((ref) => {
        let targetNode = nodes.find((t) => t.id === ref.id);
        n.links.push({
          source: n.id,
          target: targetNode.id,
          refType: ref.type,
          size: ref.type === LINK_TYPE_HARD ? 3 : 2,
          weight: ref.type === LINK_TYPE_HARD ? 5 : 1,
          label: "",
          type: "arrow",
          color: chroma(targetNode.color).alpha(0.5).hex(),
        });
      });
  });

  nodes = nodes.filter((n) => n.group != "definitions");
  return {
    nodes,
    scopes: nodes.filter((n) => n.isScope),
  };
}

const GraphSource = ({ children }) => {
  const { settings, setSettings } = useSettingsContext();
  const { setSourceRefreshBusy } = useSetSourceRefresh();

  const [graphState, setGraphState] = useState({
    instances: {},
    definitions: {},
  });
  const [nodeData, setNodeData] = useState({
    nodes: [],
    scopes: [],
  });

  // Load Definitions and Instances
  useEffect(async () => {
    let models = await Promise.all([
      fetch("/api/definitions").then((resp) => resp.json()),
      fetch("/api/instances").then((resp) => resp.json()),
    ]);
    setGraphState({
      definitions: models[0],
      instances: models[1],
    });
  }, [setGraphState]);

  // Refresh
  useEffect(async () => {
    if (!settings.sourceRefresh) {
      return;
    }

    if (settings.sourceRefresh.source === 'definitions') {
      let models = await fetch("/api/definitions/refresh").then((resp) => resp.json());
      setGraphState({
        ...graphState,
        definitions: models
      })
    } else if (settings.sourceRefresh.source === 'instances') {
      let models = await fetch("/api/instances/refresh").then((resp) => resp.json());
      setGraphState({
        ...graphState,
        instances: models
      })
    }
    setSourceRefreshBusy(false);
  }, [settings.sourceRefresh && settings.sourceRefresh.ts, setGraphState]);

  // Nodify
  useEffect(async () => {
    setNodeData(nodify(graphState, settings.source));
  }, [graphState, setNodeData, settings.source]);

  return (
    <>
      <Graph nodeData={nodeData}>{children}</Graph>
      <ControlsContainer position={"top-right"}>
      </ControlsContainer>
      <ControlsContainer position={"top-left"}>
        <FedControl />
        <SourceControl />
        <FilterControl />
        <ExportControl />
      </ControlsContainer>
      <ControlsContainer position={"bottom-right"}>
        <ZoomControl />
        <LayoutControl />
      </ControlsContainer>
    </>
  );
};

export default GraphSource;
