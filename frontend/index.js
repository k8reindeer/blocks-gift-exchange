import {
	initializeBlock,
	Box,
	Button,
	ChoiceToken,
	colorUtils,
	colors,
	ConfirmationDialog,
	expandRecord,
	Icon,
	Text,
	TextButton,
	useRecords,
	useSettingsButton
} from '@airtable/blocks/ui';
import React, {useEffect, useState} from 'react';
import {Visualizer} from './visualizer';
import {useSettings, SettingsForm} from './settings';
import {loadCSSFromURLAsync} from '@airtable/blocks/ui';

loadCSSFromURLAsync("https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.0.0/animate.min.css");

function RecordLink({record}) {
	return (
		<TextButton onClick={() => expandRecord(record)}>
	    {record.name}
	  </TextButton>
	)
}

function SuccessMessage({settings}) {
  return (<>
		<Icon 
			className="animate__animated animate__tada" 
			name="gift" 
			margin={3} 
			size={64} 
			fillColor={colorUtils.getHexForColor(colors.RED)} 
		/>
		<Text textAlign="center"> 
			Success! A perfect gift assignment is stored in the <strong>{settings.assignmentField.name}</strong> field! 
		</Text> 
	</>)
}

function Warnings({warnings}) {
	return(
		<Box
		  flex="auto"
		  display="flex"
		  flexDirection="column"
		  minHeight="0"
		  alignItems="flex-start">
  	<Text> 
  		<Icon name="warning" size={16} marginX={2} fillColor={colorUtils.getHexForColor(colors.YELLOW_BRIGHT)}  />
  		There are {warnings.length} issues 
  	</Text>
  	<Box
  		marginY={2}
  		overflowY="scroll"
		  maxHeight="100vh"
		  backgroundColor="lightGray3">
	  	{warnings.map((w, i) => {
	  		return (
	  			<Box
	  				key={i}
	  				margin={2}
	  				padding={1}
	  				borderRadius={2}
	  				backgroundColor="white">
	  				<Text> {w} </Text>
	  			</Box>
	  		)
	  	})}
  	</Box>
	</Box>)
}


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
				warnings.push(<><RecordLink record={r}/> isn't assigned to give to anyone </>);
				continue;
			}

			for (const a of assignments) {
				if (!reverseLookup[a.id]) {
					reverseLookup[a.id] = [];
				}
				reverseLookup[a.id].push(r.id);
			}
			if (assignments.length > 1) {
				warnings.push(<><RecordLink record={r}/> is assigned to give to multiple people </>);
			} else {
				const assignmentId = assignments[0].id;
				if (assignmentId === r.id) {
					warnings.push(<><RecordLink record={r}/> is assigned to themself!</>);
				} else if (settings.groupField) {
					// If there's a group field set up, make sure I'm not giving to someone in my group, 
					const assignment = records.find((x) => x.id === assignmentId)
					const myGroup = r.getCellValue(settings.groupField.id);
					if (myGroup.id === assignment.getCellValue(settings.groupField.id).id) {
						warnings.push(<>
							<RecordLink record={r}/> is assigned to <RecordLink record={assignment}/> but they're both in group <ChoiceToken choice={myGroup}/>
						</>);
					}
				}
			}
		}

		for (const r of records) {
			if (!(r.id in reverseLookup)) {
				warnings.push(<>Nobody is assigned to give to <RecordLink record={r}/></> )
			}
		// everyone is giving to a different person, every person will receive 1 gift
		}
		for (const [recipientId, givers] of Object.entries(reverseLookup)) {
			if (givers.length > 1) {
				const recipient = records.find((x) => x.id === recipientId)
				warnings.push(<>{givers.length} people are assigned to give to <RecordLink record={recipient}/> </>)
			}
		}

		return warnings;
	}

	function safeMakeMatch() {
		if (allWarnings.length === 0) {
			// If there are no warnings, confirm before throwing out a successful match.
			setIsDialogOpen(true);
		} else {
			makeMatch();
		}
	}

	// yes we do want this to go on every rerender
	const allWarnings = validateMatch();

	return (<Box display="flex" flex="auto" alignItems="flex-start" justifyContent="center">
		<Box 
			flex="none"
      display="flex"
      flexDirection="column"
      width="200px"
      backgroundColor="white"
      height="100%"
      maxHeight="100vh"
      borderRight="thick"
		>
		  <Box
        flex="auto"
        display="flex"
        flexDirection="column"
        minHeight="0"
        padding={3}
        overflowY="auto"
        alignItems="center"
      >
				<Button icon="share" variant="primary" margin={3} onClick={safeMakeMatch}>
		    	Make Match
		  	</Button>
				{allWarnings.length == 0 ? 
					<SuccessMessage settings={settings}/> :
					<Warnings warnings={allWarnings}/>
			  }
			</Box>
		</Box>
	  <Box flex="auto">
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

// Group the warnings??, make them a lot prettier. 
// warning bullet styling
// warning icon styling
// refactor warnings
// Layout -- make the nodes/labels big, but buttons laid out on the side with good margins
// ability to hide visualization if you want to keep it a secret
// make layout work with settings open or closed even as viewport changes
// make it shake every time a new good one is found, not just the first time.
// make it animate on hover
// make tooltip actually look good


// # Functional

// better matching algorithm
// - no warnings, by default
// - make it animate gradually as the assignments get made


// # Cleanup

// uninstall unused cytoscape layouts, I like the circle (OR, make it switchable?)
// docstrings on everything
// lint, cleanup code
