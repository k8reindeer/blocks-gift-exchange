import {
	initializeBlock,
	Box,
	expandRecord,
	loadCSSFromURLAsync,
	Text,
	useSettingsButton
} from '@airtable/blocks/ui';
import React, {useEffect, useState} from 'react';
import {Matcher} from './matcher';
import {Visualizer} from './visualizer';
import {useSettings, SettingsForm} from './settings';


loadCSSFromURLAsync("https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.0.0/animate.min.css");

function SecretSantaBlock() {
  const {areSettingsValid, message, settings} = useSettings();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [settingsLeaving, setSettingsLeaving] = useState(false);

  function closeSettings() {
  	// Used to animate the settings pane when it closes
  	setSettingsLeaving(true);
  	setTimeout(() => {
  		setIsSettingsVisible(false);
  		setSettingsLeaving(false);
  	}, 1000)
  }

  useSettingsButton(() => {
  	if (isSettingsVisible) {
  		closeSettings();
  	} else {
  		setIsSettingsVisible(true);
  	}
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
      	{areSettingsValid ? <Matcher settings={settings}/> : (
          <Box display="flex" flex="auto" alignItems="center" justifyContent="center">
            <Text textColor="light">{message}</Text>
          </Box>
      	)}
      </Box>
      {isSettingsVisible &&  (
        <SettingsForm closeSettings={closeSettings} settingsLeaving={settingsLeaving} settings={settings} />
      )}
    </Box>
  );
}

initializeBlock(() => <SecretSantaBlock />);

// TODO

// # Visual

// refactor warnings to output in terms of types not jsx elements
// ability to hide visualization if you want to keep it a secret (hide by default)
// make present shake every time a new good one is found, not just the first time.
// make present animate on hover
// make tooltip in settings actually look good
// center settings invalid message better


// # Functional

// better matching algorithm
// - no warnings, by default
// - make it animate gradually as the assignments get made

// # Cleanup

// refactor into separate files
// uninstall unused cytoscape layouts, I like the circle
// docstrings on everything
// lint, cleanup code
