import {
	initializeBlock,
	Box,
	expandRecord,
	loadCSSFromURLAsync,
	Text
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
          <Box display="flex" flex="auto" alignItems="center" justifyContent="center">
            <Text textColor="light">{message}</Text>
          </Box>
      	)}
      </Box>
      <SettingsForm/>
    </Box>
  );
}

initializeBlock(() => <GiftExchangeBlock />);

// TODO

// # Visual

// make present animate on hover
// center settings invalid message better
// no warings if there's literally nothing in the column


// # Cleanup

// uninstall unused cytoscape layouts, I like the circle
// docstrings on everything
// lint, cleanup code
