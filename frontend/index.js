import {
	initializeBlock,
	Box,
	colors,
	colorUtils,
	expandRecord,
	Icon,
	loadCSSFromURLAsync,
	Text,
	Tooltip
} from '@airtable/blocks/ui';
import React, {useEffect, useState} from 'react';
import {Matcher} from './matcher';
import {useSettings, SettingsForm} from './settings';


loadCSSFromURLAsync("https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.0.0/animate.min.css");

function GiftExchangeBlock() {
  const {areSettingsValid, message} = useSettings();

  return (
    <Box position="absolute" top="0" left="0" bottom="0" right="0" display="flex">
      <Box display="flex" flexDirection="column" flex="auto">
      	{areSettingsValid ? <Matcher/> : (
      		<Box margin={3} display="flex" flexDirection="row" justifyContent="start">
    				<Tooltip
					    content={message}
					    placementX={Tooltip.placements.CENTER}
					    placementY={Tooltip.placements.BOTTOM}
					    shouldHideTooltipOnClick={true}
					  >
			    		<Icon name="warning" size={16} marginX={2} 
			    			fillColor={colorUtils.getHexForColor(colors.ORANGE_BRIGHT)}/>
					  </Tooltip>
						<Text textColor="light">
				     	Settings Invalid
				   	</Text>
				  </Box>
      	)}
      </Box>
      <SettingsForm/>
    </Box>
  );
}

initializeBlock(() => <GiftExchangeBlock />);
