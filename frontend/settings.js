import React from 'react';
import {
  Box,
  Button,
  FieldPickerSynced,
  FormField,
  Heading,
  TablePickerSynced,
  ViewPickerSynced,
  useBase,
  useGlobalConfig
} from '@airtable/blocks/ui';
import {FieldType} from '@airtable/blocks/models';

export const ConfigKeys = Object.freeze({
  TABLE_ID: 'tableId',
  VIEW_ID: 'viewId',
  ASSIGNMENT_FIELD_ID: 'assignmentFieldId',
  GROUP_FIELD_ID: 'groupFieldId'
});

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

  if (!table) return invalid('Pick the table with the people you want to assign');
  if (!view) return invalid('Pick the view with the people you want to assign');
  if (!assignmentField) return invalid('Pick a field to save assignments');
  if (assignmentField.type != FieldType.MULTIPLE_RECORD_LINKS) return invalid('Assignment field must be a link field');
  if (groupField && groupField.type != FieldType.SINGLE_SELECT) return invalid('Group field must be a single select field');

  return {
    areSettingsValid: true,
    settings,
  };
}

export function SettingsForm({setIsSettingsVisible, settings}) {
  return (
    <Box
      flex="none"
      display="flex"
      flexDirection="column"
      width="300px"
      backgroundColor="white"
      maxHeight="100vh"
      borderLeft="thick"
    >
      <Box
        flex="auto"
        display="flex"
        flexDirection="column"
        minHeight="0"
        padding={3}
        overflowY="auto"
      >
        <Heading marginBottom={3}>Settings</Heading>
        <FormField label="Table">
          <TablePickerSynced globalConfigKey={ConfigKeys.TABLE_ID} />
        </FormField>
        {settings.table && (
          <>
            <FormField
              label="View"
              description="Only people in this view will be matched"
            >
              <ViewPickerSynced
                table={settings.table}
                globalConfigKey={ConfigKeys.VIEW_ID}
              />
            </FormField>
            <FormField 
              label="Assignment field"
              description="Where to store the gift-giving assignments. Hint: hide this column if you want to keep the assignments a secret, even from yourself!"
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
              />
            </FormField>
          </>
        )}
      </Box>
      <Box
        flex="none"
        display="flex"
        justifyContent="flex-end"
        paddingY={3}
        marginX={3}
        borderTop="thick"
      >
        <Button variant="primary" size="large" onClick={() => setIsSettingsVisible(false)}>
          Done
        </Button>
      </Box>
    </Box>
  );
}