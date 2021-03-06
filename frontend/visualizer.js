import {
  expandRecord,
  useRecords,
  colors,
  colorUtils, 
  useViewport
} from '@airtable/blocks/ui';
import React, {useEffect} from 'react';
import cytoscape from 'cytoscape';
import avsdf from 'cytoscape-avsdf';
import CytoscapeComponent from 'react-cytoscapejs';
import {useSettings} from './settings';


cytoscape.use( avsdf );

/**
 * Visualize the current match using cytoscape
 *
 * Each record is displayed as a node, and any assignments in 
 * the configured assignmentField are displayed as edges.  
 * Updates as the records / links are updated.
 */
export function Visualizer() {
  const {settings} = useSettings();
  const opts = {
    fields: [settings.assignmentField, settings.groupField]
  };
  const records = useRecords(settings.view, opts);
  const viewport = useViewport();
  var layoutInstance;

  useEffect(() => {
    if (layoutInstance) {
      layoutInstance.run();
    }
  }, [records, layoutInstance])

  let elements = [];
  if (!records) {
    return null;
  }
  for (let r of records) {
    let nodeData = { id: r.id, label: r.name || 'Unnamed record'}
    if (settings.groupField) {
      // If groups are being used, specify which group (used for color coding)
      const group = r.getCellValue(settings.groupField.id)
      if (group) {
        nodeData['group'] = group.id;
      }
    }
    elements.push({data: nodeData})

    // Display visualization even if there are no assignments or assignments are invalid
    const assignments = r.getCellValue(settings.assignmentField.id);
    if (!assignments) {
      continue;
    }
    for (let a of assignments) {
      // If the edge points to a record not in this view, don't display it
      if (records.find((rec) => rec.id === a.id)) {
        elements.push({ data: { source: r.id, target: a.id } })
      }
    }
  }

  let style = [
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'width': 'label',
        'height': 'label',
        'text-valign': 'center',
        'text-halign': 'center',
        'shape': 'ellipse',
        'padding': '8px',
        'background-color': colorUtils.getHexForColor(colors.GRAY_LIGHT_2)
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 5,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ]
  if (settings.groupField) {
    // If groups are being used, style each node by its group's color
    for (let choice of settings.groupField.options.choices) {
      const color = colorUtils.shouldUseLightTextOnColor(choice.color) ? {'color': 'white'} : {};
      style.push({
        selector: `[group="${choice.id}"]`,
        style: {
          'background-color': colorUtils.getHexForColor(choice.color),
          ...color
        }
      })
    }
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const layout = { name: 'avsdf', randomize: false, refresh: 30, nodeSeparation: 90, animate: mediaQuery.matches ? false : 'end'};
  const width = viewport.size.width-200

  return (<>
    <CytoscapeComponent
      elements={[...elements]}
      layout={layout}
      cy={(cy) => {
        cy.nodes().on("click", (e) => {
          expandRecord(records.find((r) => r.id === e.target.id()));
        })
        layoutInstance = cy.makeLayout(layout);
      }}
      style={ { width: `${width}px`, height: '400px' } }
      stylesheet={style}
      userPanningEnabled={false}
    />
  </>)
}