import React, {useEffect, useState} from 'react';
import {
  Box,
  Button,
  colors,
  colorUtils,
  FieldPickerSynced,
  FormField,
  Heading,
  Icon,
  TablePickerSynced,
  Text,
  ViewPickerSynced,
  useBase,
  useGlobalConfig,
  useSettingsButton
} from '@airtable/blocks/ui';
import {cursor} from '@airtable/blocks';
import {FieldType} from '@airtable/blocks/models';

export const ConfigKeys = Object.freeze({
  TABLE_ID: 'tableId',
  VIEW_ID: 'viewId',
  ASSIGNMENT_FIELD_ID: 'assignmentFieldId',
  GROUP_FIELD_ID: 'groupFieldId'
});


function allKeysUnset(globalConfig) {
  return Object.values(ConfigKeys).every((k) => globalConfig.get(k) === undefined);
}

/**
 * A React hook to validate and access settings configured in SettingsForm.
 * @returns {{
 *  settings: {
 *      table: Table | null,
 *      view: View | null,
 *      assignmentField: Field | null,
 *      groupField: Field | null
 *  },
 *  areSettingsValid: boolean,
 *  message?: string}}
 */
export function useSettings() {
  const base = useBase();
  const globalConfig = useGlobalConfig();

  // If there's literally nothing in globalConfig, we haven't set any settings yet...
  // Try to set some sensible defaults
  if (allKeysUnset(globalConfig)) {
    // Get the active table and view. Don't use watchable because this happens only once
    let updates = [
      {path: [ConfigKeys.TABLE_ID], value: cursor.activeTableId},
      {path: [ConfigKeys.VIEW_ID], value: cursor.activeViewId},
    ];
    const table = base.getTableByIdIfExists(cursor.activeTableId);
    if (table) {
      // Find a field of the correct type to be assignment field
      const candidateFields = table.fields.filter((f) => {
        return (f.type === FieldType.MULTIPLE_RECORD_LINKS &&
          f.options.linkedTableId === table.id);
      })
      if (candidateFields.length > 0) {
        updates.push({path: [ConfigKeys.ASSIGNMENT_FIELD_ID], value: candidateFields[0].id})
      }
    }
    if (globalConfig.hasPermissionToSetPaths(updates)) {
      globalConfig.setPathsAsync(updates);
    }
  }

  const table = base.getTableByIdIfExists(globalConfig.get(ConfigKeys.TABLE_ID));
  const view = table ? table.getViewByIdIfExists(globalConfig.get(ConfigKeys.VIEW_ID)) : null;
  const assignmentField = table
    ? table.getFieldByIdIfExists(globalConfig.get(ConfigKeys.ASSIGNMENT_FIELD_ID))
    : null;

  const groupField = table
    ? table.getFieldByIdIfExists(globalConfig.get(ConfigKeys.GROUP_FIELD_ID))
    : null;

  const settings = {
    table,
    view,
    assignmentField,
    groupField
  };

  const invalid = (message) => {
    return {
      areSettingsValid: false,
      message: message,
      settings,
    };
  }

  if (!table) return invalid('Pick a table');
  if (!view) return invalid('Pick a view');
  if (!assignmentField) return invalid('Pick a field to save assignments');
  if (assignmentField.type != FieldType.MULTIPLE_RECORD_LINKS) 
    return invalid('Assignment field must be a link field');
  if (assignmentField.options.linkedTableId != table.id)
    return invalid(`Assignment field must link to ${table.name} table`);
  if (groupField && groupField.type != FieldType.SINGLE_SELECT) 
    return invalid('Group field must be a single select field');

  return {
    areSettingsValid: true,
    settings,
  };
}


/**
 * The settings form component.
 * Handles display logic for opening/closing itself.
 */
export function SettingsForm() {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [settingsLeaving, setSettingsLeaving] = useState(false);
  const {areSettingsValid, settings, message} = useSettings();

  // Open the SettingsForm whenever the settings are not valid
  useEffect(() => {
    if (!areSettingsValid) {
      setIsSettingsVisible(true);
    }
  }, [areSettingsValid]);

  // Animate the settings form when it closes
  function closeSettings() {
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

  return isSettingsVisible && (
    <Box
      flex="none" display="flex" flexDirection="column"
      position="absolute" top="0" bottom="0" right="0"
      width="300px" maxHeight="100vh" borderLeft="thick" backgroundColor="white"
      className={`animate__animated animate__slide${settingsLeaving ? "Out" : "In"}Right`}
    >
      <Box
        flex="auto" display="flex" flexDirection="column"
        minHeight="0" padding={3} overflowY="auto"
      >
        <Heading marginBottom={3}>Settings</Heading>
        <FormField
          label="Table"
          decription="The table with the records you want to assign"
        >
          <TablePickerSynced globalConfigKey={ConfigKeys.TABLE_ID} />
        </FormField>
        {settings.table && (
          <>
            <FormField
              label="View"
              description="Only records in this view will be matched"
            >
              <ViewPickerSynced
                table={settings.table}
                globalConfigKey={ConfigKeys.VIEW_ID}
              />
            </FormField>
            <FormField
              label="Assignment field"
              description="Field to store the gift-giving assignments."
            >
              <FieldPickerSynced
                table={settings.table}
                globalConfigKey={ConfigKeys.ASSIGNMENT_FIELD_ID}
                allowedTypes={[FieldType.MULTIPLE_RECORD_LINKS]}
              />
            </FormField>
            <FormField
              label="Group field (optional)"
              description="People in the same group won't be assigned to each other"
            >
              <FieldPickerSynced
                table={settings.table}
                globalConfigKey={ConfigKeys.GROUP_FIELD_ID}
                allowedTypes={[FieldType.SINGLE_SELECT]}
                shouldAllowPickingNone={true}
              />
            </FormField>
          </>
        )}
      </Box>
      <Box
        flex="none" display="flex" justifyContent={areSettingsValid ? "flex-end" : "space-between"}
        alignItems="center" paddingY={3} marginX={3} borderTop="thick"
      >
        {!areSettingsValid && <Text textColor="light">
          <Icon name="warning" size={16} marginX={2}
            fillColor={colorUtils.getHexForColor(colors.ORANGE_BRIGHT)}/>
          {message}
        </Text>}
        <Button variant="primary" size="large" onClick={closeSettings}
          disabled={!areSettingsValid}>
          Done
        </Button>
      </Box>
    </Box>
  );
}
