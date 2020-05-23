import {initializeBlock, Box, Button, ConfirmationDialog, Text, useRecords, useSettingsButton} from '@airtable/blocks/ui';
import React, {useEffect, useState} from 'react';
import {Visualizer} from './visualizer';
import {useSettings, SettingsForm} from './settings';


function MatchMaker({settings}) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	async function makeMatch() {
		const records = (await settings.view.selectRecordsAsync()).records;

		// randomly assign (TODO better algorithm here!! at least avoid stated constraints)
		const recordIds = records.map((r) => r.id);
	  recordIds.sort(function (a, b) { return 0.5 - Math.random() })
		const assignments = recordIds.map((this_id, i, arr) => {
			const next_id = arr[(i+1) % arr.length];
			return {
				id: this_id,
				fields: {
					[settings.assignmentField.id]: [{id: next_id}],
				}
			}
		});

		settings.table.updateRecordsAsync(assignments);
	}

	function validateMatch() {
		const records = useRecords(settings.view);
		let warnings = [];
		let reverseLookup = {}; // for each person, a list of all who will be giving to them

		if (!records) {
			return [];
		}
		for (const r of records) {
			const assignments = r.getCellValue(settings.assignmentField.id);
			// Make sure I'm giving to someone
			if (!assignments || assignments.length == 0) {
				warnings.push(`${r.name} isn't assigned to give to anyone`);
				continue;
			}

			for (const a of assignments) {
				if (!reverseLookup[a.id]) {
					reverseLookup[a.id] = [];
				}
				reverseLookup[a.id].push(r.id);
			}
			if (assignments.length > 1) {
				warnings.push(`${r.name} is assigned to give to multiple people`);
			} else {
				const assignmentId = assignments[0].id;
				if (assignmentId === r.id) {
					warnings.push(`${r.name} is assigned to themself!`);
				}
				
				if (settings.groupField) {
					// If there's a group field set up, make sure I'm not giving to someone in my group, 
					const assignment = records.find((x) => x.id === assignmentId)
					const myGroup = r.getCellValue(settings.groupField.id);
					if (myGroup.id === assignment.getCellValue(settings.groupField.id).id) {
						warnings.push(`${r.name} is assigned to ${assignment.name} but they're both in group ${myGroup.name}`);
					}
				}
			}
		}

		for (const r of records) {
			if (!(r.id in reverseLookup)) {
				warnings.push(`Nobody is assigned to give to ${r.name}`)
			}
		// everyone is giving to a different person, every person will receive 1 gift
		}
		for (const [recipientId, givers] of Object.entries(reverseLookup)) {
			if (givers.length > 1) {
				const recipient = records.find((x) => x.id === recipientId)
				warnings.push(`${givers.length} people are assigned to give to ${recipient.name}`)
			}
		}

		return warnings;
	}

	// yes we do want this to go on every rerender
	const allWarnings = validateMatch();

	return (<Box display="flex" flexDirection="row" flex="auto"> 
		<Box flex="1">
			<Button icon="share" variant="primary" onClick={() => {
				if (allWarnings.length === 0) {
					// If there are no warnings, confirm before throwing out a successful match.
					setIsDialogOpen(true);
				} else {
					makeMatch();
				}
			}}>
	    	Make Match
	  	</Button>
			{allWarnings.length == 0 ? 
		  	<p> All set, everything's good! </p> :
		  	allWarnings.map((w, i) => {
		  		return <p key={i}> {w} </p>
		  	})
		  }
		</Box>
	  <Box flex="2">
	  	<Visualizer settings={settings}/>
	  </Box>
    {isDialogOpen && (
      <ConfirmationDialog
        title="Are you sure?"
        body="This will throw out your current match"
        onConfirm={() => {
        	makeMatch();
          setIsDialogOpen(false);
        }}
        onCancel={() => setIsDialogOpen(false)}
      />
    )}
	</Box>)
}

function SecretSantaBlock() {
  const {areSettingsValid, message, settings} = useSettings();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  useSettingsButton(() => {
    setIsSettingsVisible(!isSettingsVisible);
  });

  // Open the SettingsForm whenever the settings are not valid
  useEffect(() => {
    if (!areSettingsValid) {
      setIsSettingsVisible(true);
    }
  }, [areSettingsValid]);

  return (
    <Box position="absolute" top="0" left="0" bottom="0" right="0" display="flex">
      <Box display="flex" flexDirection="column" flex="auto">
      	{areSettingsValid ? <MatchMaker settings={settings}/> : (
          <Box display="flex" flex="auto" alignItems="center" justifyContent="center">
            <Text textColor="light">{message}</Text>
          </Box>
      	)}
      </Box>
      {isSettingsVisible &&  (
        <SettingsForm setIsSettingsVisible={setIsSettingsVisible} settings={settings} />
      )}
    </Box>
  );
}

initializeBlock(() => <SecretSantaBlock />);

// TODO

// # Visual

// Group the warnings, make them a lot prettier. 
// Make it funner when everything has worked!
// Layout -- make the nodes/labels big, but buttons laid out on the side with good margins
// make layout work with settings open or closed even as viewport changes

// # Functional

// better matching algorithm
// - no warnings, by default
// - make it animate gradually as the assignments get made

// tooltip about hiding the assignment column

// # Cleanup

// uninstall unused cytoscape layouts, I like the circle (OR, make it switchable?)
// docstrings on everything
// lint, cleanup code