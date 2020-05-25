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
  MULTIPLE_GIVERS: 'multiple_givers'
});

function RecordLink({record}) {
	return (
		<TextButton onClick={() => expandRecord(record)}>
	    {record.name}
	  </TextButton>
	)
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

export function WarningsList({warnings}) {
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