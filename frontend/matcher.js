import {
	Box,
	Button,
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
import {useSettings} from './settings';
import {WarningType, WarningsList} from './warnings';


function useValidateMatch(records) {
	const {settings} = useSettings();

	let warnings = []; // document type: list of {type: WarningType, giver: Record | null, recipient: Record | null}
	let reverseLookup = {}; // for each person, a list of all who will be giving to them

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


function SuccessMessage() {
	const {settings} = useSettings();
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


export function Matcher() {
	const {settings} = useSettings();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);
	const records = useRecords(settings.view);
	const {isMatchValid, warnings} = useValidateMatch(records);

	async function makeMatch() {
		const records = (await settings.view.selectRecordsAsync()).records;

		function getRandomItem(arr) {
	    return arr[Math.floor(Math.random() * arr.length)];
		}

		function tryMatch() {
			// returns a {success, list of assignments}
			let assignments = [];
			let remaining = new Set(records.map((r) => {
				return {
					id: r.id, 
					group: settings.assignmentField && r.getCellValue(settings.groupField.id).id
				}
			}));

			const first = getRandomItem(Array.from(remaining))
			remaining.delete(first);
			let current = first
			while (remaining.size > 0) {
				const possibleNext = Array.from(remaining).filter((x) => x.group != current.group)
				if (possibleNext.length === 0) {
					// We've hit a dead end
					return {success: false, assignments};
				}
				const next = getRandomItem(possibleNext);
				remaining.delete(next);
				assignments.push({
					id: current.id,
					fields: {
						[settings.assignmentField.id]: [{id: next.id}]
					}
				});
				current = next;
			}

			// and complete the loop, if the groups match up
			if (current.group === first.group) {
				return {success: false, assignments};
			}
			assignments.push({
				id: current.id,
				fields: {
					[settings.assignmentField.id]: [{id: first.id}]
				}
			});
			return {success: true, assignments};
		}

		// It may not be possible, but try 5 times
		var retries = 0;
		while (retries++ < 5) {
			const {success, assignments} = tryMatch();
			await settings.table.updateRecordsAsync(assignments);
			if (success) break;
		}
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
					<SuccessMessage /> :
					<WarningsList warnings={warnings}/>
			  }
			  <Button margin={3} onClick={() => setIsVisualizationOpen(!isVisualizationOpen)}>
			  	{isVisualizationOpen ? "Hide Visualiation" : "Show Visualization"}
				</Button>
			</Box>
		</Box>
	  <Box flex="auto">
	  	{isVisualizationOpen && <Visualizer/>}
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
