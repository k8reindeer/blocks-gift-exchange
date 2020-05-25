import {
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
} from '@airtable/blocks/ui';
import React, {useState} from 'react';
import {Visualizer} from './visualizer';
import {useSettings, SettingsForm} from './settings';

const WarningType = Object.freeze({
  NO_ASSIGNMENT: 'no_assignment',
  MULTIPLE_ASSIGNMENTS: 'multiple_assignments',
  SELF_ASSIGNMENT: 'self_assignment',
  SAME_GROUP_ASSIGNMENT: 'same_group_assignment',
  NO_GIVERS: 'no_givers',
  MULTIPLE_GIVERS: 'multiple_givers'
});


function useValidateMatch(records) {
	const {settings} = useSettings();

	let warnings = []; // document type: list of {type: WarningType, giver: Record | null, recipient: Record | null}
	let reverseLookup = {}; // for each person, a list of all who will be giving to them
	console.log("validating match");
	console.log(records);
	if (!records) {
		return {isMatchValid: true, warnings};
	}
	for (const r of records) {
		const assignments = r.getCellValue(settings.assignmentField.id);
		// Make sure I'm giving to someone
		if (!assignments || assignments.length == 0) {
			warnings.push({type: WarningType.NO_ASSIGNMENT, giver: r});
			continue;
		}

		for (const a of assignments) {
			if (!reverseLookup[a.id]) {
				reverseLookup[a.id] = [];
			}
			reverseLookup[a.id].push(r.id);
		}
		if (assignments.length > 1) {
			warnings.push({type: WarningType.MULTIPLE_ASSIGNMENTS, giver: r});
		} else {
			const assignmentId = assignments[0].id;
			if (assignmentId === r.id) {
				warnings.push({type: WarningType.SELF_ASSIGNMENT, giver: r});
			} else if (settings.groupField) {
				// If there's a group field set up, make sure I'm not giving to someone in my group, 
				const assignment = records.find((x) => x.id === assignmentId)
				const myGroup = r.getCellValue(settings.groupField.id);
				if (myGroup.id === assignment.getCellValue(settings.groupField.id).id) {
					warnings.push({type: WarningType.SAME_GROUP_ASSIGNMENT, giver: r, recipient: assignment});
				}
			}
		}
	}

	for (const r of records) {
		if (!(r.id in reverseLookup)) {
			warnings.push({type: WarningType.NO_GIVERS, recipient: r})
		}
	// everyone is giving to a different person, every person will receive 1 gift
	}
	for (const [recipientId, givers] of Object.entries(reverseLookup)) {
		if (givers.length > 1) {
			const recipient = records.find((x) => x.id === recipientId)
			warnings.push({type: WarningType.MULTIPLE_GIVERS, recipient: recipient});
		}
	}

	return {
		isMatchValid: warnings.length === 0,
		warnings
	}
}

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

function Warning({type, giver, recipient}) {
	switch(type) {
		case WarningType.NO_ASSIGNMENT:
			return <><RecordLink record={giver}/> isn't assigned to give to anyone </>
		case WarningType.MULTIPLE_ASSIGNMENTS:
			return <><RecordLink record={giver}/> is assigned to give to multiple people </>
		case WarningType.SELF_ASSIGNMENT:
			return <><RecordLink record={giver}/> is assigned to themself!</>
		case WarningType.SAME_GROUP_ASSIGNMENT:
			return (<>
				<RecordLink record={giver}/> is assigned to <RecordLink record={recipient}/> but they're both in the same group.
			</>)
		case WarningType.NO_GIVERS:
			return <>Nobody is assigned to give to <RecordLink record={recipient}/></> 
		case WarningType.MULTIPLE_GIVERS: 
			return <>Multiple people are assigned to give to <RecordLink record={recipient}/> </>
		default:
			return null;

	}
}

function WarningsList({warnings}) {
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
	  				<Warning {...w}/>
	  			</Box>
	  		)
	  	})}
  	</Box>
	</Box>)
}

export function Matcher({settings}) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const records = useRecords(settings.view);
	const {isMatchValid, warnings} = useValidateMatch(records);

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

	function safeMakeMatch() {
		if (isMatchValid) {
			// If the match is already valid, warn before continuing
			setIsDialogOpen(true);
		} else {
			makeMatch();
		}
	}

	return (<Box display="flex" flex="auto" alignItems="flex-start" justifyContent="center">
		<Box 
			flex="none"
      display="flex"
      flexDirection="column"
      width="200px"
      backgroundColor="white"
      height="100%"
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
				{isMatchValid ? 
					<SuccessMessage settings={settings}/> :
					<WarningsList warnings={warnings}/>
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
