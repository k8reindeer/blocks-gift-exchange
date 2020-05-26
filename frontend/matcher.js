import {
  Box,
  Button,
  colorUtils,
  colors,
  ConfirmationDialog,
  Icon,
  Text,
  useRecords,
} from '@airtable/blocks/ui';
import React, {useState} from 'react';
import {Visualizer} from './visualizer';
import {useSettings} from './settings';
import {WarningType, WarningsList} from './warnings';


/**
 * Determine whether the current assignments in assignmentField make a valid gift assignment
 * 
 * * Every record is assigned to exactly 1 other record 
 *     (otherwise returns warning of type NO_ASSIGNMENT or MULTIPLE_ASSIGNMENTS)
 * * No record is assigned to itself (otherwise returns warning of type SELF_ASSIGNMENT)
 * * No record is assigned to a record that is in the same group according to groupField
 *     (otherwise returns warning of type SAME_GROUP_ASSIGNMENT)
 * * Every record has exactly 1 other record assigned to it
 *     (otherwise returns warning of type NO_GIVERS or MULTIPLE_GIVERS)
 *
 * @returns {
 *   isMatchValid: boolean,
 *   warnings: {
 *     type: WarningType,
 *     giver: Record | null,
 *     recipient: Record | null
 *   }[]
 * }
 */
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
        if (!assignment) {
        	warnings.push({type: WarningType.INVALID_ASSIGNMENT, giver: r})
        } else {
        	const myGroup = r.getCellValue(settings.groupField.id);
	        if (myGroup.id === assignment.getCellValue(settings.groupField.id).id) {
	          warnings.push({type: WarningType.SAME_GROUP_ASSIGNMENT, giver: r, recipient: assignment});
	        }
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

export function Matcher() {
  const {settings} = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);
  const [shakePresent, setShakePresent] = useState(false);

  const records = useRecords(settings.view);
  const {isMatchValid, warnings} = useValidateMatch(records);

  async function makeMatch() {
  	// We don't want the records changing out from under us while searching for a matching
    const records = (await settings.view.selectRecordsAsync()).records;

    function getRandomItem(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Try to randomly make a matching
     * 
     * A matching following all the rules may not be possible (example: over half of people are in
     * the same group.) This algorithm doesn't definitively prove if a matching is impossible - it simply
     * tries greedily to find a working match 5 times and then gives up 
     * @returns {{
		 *   success: boolean,
		 *   assignments: {id: string, fields: Object}[]
     * }}
     * The assignments return value can directly be used to create records, even if the full matching
     * was unsuccessful
     */
    function tryMatch() {
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

      // Now complete the loop, assign the last person to the first (but only if the groups match up)
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

    // Try up to 5 times, or until we get a complete/successful match
    var retries = 0;
    while (retries++ < 5) {
      const {success, assignments} = tryMatch();
      await settings.table.updateRecordsAsync(assignments);
      if (success) {
        wigglePresent();
        break;
      }
    }
  }

  const areAssignmentsEmpty = records.every((r) => r.getCellValue(settings.assignmentField.id) == null);

  function safeMakeMatch() {
    if (isMatchValid) {
      // If the match is already valid, warn before continuing
      setIsDialogOpen(true);
    } else {
      makeMatch();
    }
  }

  function wigglePresent() {
    setShakePresent(true);
    setTimeout(() => setShakePresent(false), 1000);
  }

  return (<Box display="flex" flex="auto" alignItems="flex-start" justifyContent="center">
    <Box
      flex="none" display="flex" flexDirection="column"
      width="200px" height="100%" backgroundColor="white" borderRight="thick">
      <Box
        flex="auto" display="flex" flexDirection="column" alignItems="center"
        minHeight="0" padding={3} overflowY="auto">
        <Button icon="share" variant="primary" margin={3} onClick={safeMakeMatch}>
          Make Match
        </Button>
        {isMatchValid ?
          <>
            <Icon
              className={shakePresent ?  "animate__animated animate__tada" : ""}
              name="gift" onMouseEnter={wigglePresent}
              margin={3} size={64} fillColor={colorUtils.getHexForColor(colors.RED)}
            />
            <Text textAlign="center">
              Success! A perfect gift assignment is stored in the <strong>{settings.assignmentField.name}</strong> field!
            </Text>
          </> :
          <>
            {areAssignmentsEmpty ?
            <Text> No assignments yet. Click above to make a match!</Text> :
            <WarningsList warnings={warnings}/>}
          </>
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
