import {Box, Button, expandRecord, useRecords, colorUtils} from '@airtable/blocks/ui';
import cytoscape from 'cytoscape';
import avsdf from 'cytoscape-avsdf';

import cola from 'cytoscape-cola';
import spread from 'cytoscape-spread';
import coseBilkent from 'cytoscape-cose-bilkent';

import React, {useEffect} from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

cytoscape.use( avsdf );

export function Visualizer({settings}) {
	const records = useRecords(settings.view);
	var layoutInstance;

	let elements = [];
	if (!records) {
		return null;
	}
	for (let r of records) {
		let nodeData = { id: r.id, label: r.name }
		if (settings.groupField) {
			// Mark which group for color coding if groups are being used
			nodeData['group'] = r.getCellValue(settings.groupField.id).id;
		}
		elements.push({data: nodeData})

		const assignments = r.getCellValue(settings.assignmentField.id);
		if (!assignments) {
			continue;
		}
		for (let a of assignments) {
			elements.push({ data: { source: r.id, target: a.id } })
		}
	}
	console.log(elements);

	useEffect(() => {
		console.log("using effect");
		if (layoutInstance) {
			layoutInstance.run();
		}
	}, [records])

	let style = [
    {
      selector: 'node',
      style: {
        'label': 'data(label)'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ]
  if (settings.groupField) {
  	// Style groups by their color if groups are being used
  	for (let choice of settings.groupField.options.choices) {
	  	style.push({
	  		selector: `[group="${choice.id}"]`,
	  		style: {
	  			'background-color': colorUtils.getHexForColor(choice.color)
	  		}
	  	})
	  }
  }

  const layout = { name: 'avsdf', handleDisconnected: true, randomize: false, prelayout: { name: 'cola' }};

  // get the size from current viewport size? OR SOMETHING this is wacky now and too small
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
  		style={ { height: '400px' } }  
  		stylesheet={style}
  	/>
  </>)
}