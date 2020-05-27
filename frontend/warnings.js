import {
  Box,
  colorUtils,
  colors,
  expandRecord,
  Icon,
  Text,
  TextButton,
} from '@airtable/blocks/ui';
import React from 'react';


export const WarningType = Object.freeze({
  NO_ASSIGNMENT: 'no_assignment',
  MULTIPLE_ASSIGNMENTS: 'multiple_assignments',
  SELF_ASSIGNMENT: 'self_assignment',
  SAME_GROUP_ASSIGNMENT: 'same_group_assignment',
  NO_GIVERS: 'no_givers',
  MULTIPLE_GIVERS: 'multiple_givers',
  INVALID_ASSIGNMENT: 'invalid_assignment'
});

/**
 * A utility component for rendering a link to a record that
 * expands that record when clicked.
 */
function RecordLink({record}) {
  return (
    <TextButton onClick={() => expandRecord(record)}>
      {record.name}
    </TextButton>
  )
}

/** 
 * Renders a single warning message
 * @param {WarningType} type 
 * @param {Record} [giver] - required when type is NO_ASSIGNMENT, 
 *     MULTIPLE_ASSIGNMENTS, SELF_ASSIGNMENT, or SAME_GROUP_ASSIGNMENT
 * @param {Record} [recipient] - required when type is SAME_GROUP_ASSIGNMENT, 
 *     NO_GIVERS, or MULTIPLE_GIVERS
 */
function Warning({type, giver, recipient}) {
  switch(type) {
    case WarningType.NO_ASSIGNMENT:
      return <><RecordLink record={giver}/> isn&apos;t assigned to give to anyone </>
    case WarningType.MULTIPLE_ASSIGNMENTS:
      return <><RecordLink record={giver}/> is assigned to give to multiple people </>
    case WarningType.SELF_ASSIGNMENT:
      return <><RecordLink record={giver}/> is assigned to themself!</>
    case WarningType.SAME_GROUP_ASSIGNMENT:
      return (<>
        <RecordLink record={giver}/> is assigned to <RecordLink record={recipient}/> but they&apos;re both in the same group
      </>)
    case WarningType.NO_GIVERS:
      return <>Nobody is assigned to give to <RecordLink record={recipient}/></>
    case WarningType.MULTIPLE_GIVERS:
      return <>Multiple people are assigned to give to <RecordLink record={recipient}/> </>
    case WarningType.INVALID_ASSIGNMENT:
      return <><RecordLink record={giver}/> is assigned to a record in the wrong view</>
    default:
      return null;
  }
}

/**
 * Renders a list of warning messages in a scollable box
 */
export function WarningsList({warnings}) {
  return(<>
    <Text flex="0 1 auto" alignSelf="flex-start">
      <Icon 
        name="warning" size={16} marginX={2} 
        fillColor={colorUtils.getHexForColor(colors.YELLOW_BRIGHT)}  
      />
      There are {warnings.length} issues
    </Text>
    <Box flex="0 1 auto" marginY={2} overflowY="scroll" maxHeight="80vh" backgroundColor="lightGray3">
      {warnings.map((w, i) => {
        return (
          <Box key={i} margin={2} padding={1} borderRadius={2} backgroundColor="white">
            <Warning {...w}/>
          </Box>
        )
      })}
    </Box>
  </>)
}