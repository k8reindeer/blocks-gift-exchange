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
});

/**
 * A React hook to validate and access settings configured in SettingsForm.
 * @returns {{
 *  settings: {
 *      table: Table | null,
 *      view: View | null,
 *      field: Field | null,
 *  },
 *  areSettingsValid: boolean,
 *  message?: string}}
 */
export function useSettings() {
  const base = useBase();
  const globalConfig = useGlobalConfig();

  const table = base.getTableByIdIfExists(globalConfig.get(ConfigKeys.TABLE_ID));
  const view = table ? table.getViewByIdIfExists(globalConfig.get(ConfigKeys.VIEW_ID)) : null;
  const field = table
  ? table.getFieldByIdIfExists(globalConfig.get(ConfigKeys.ASSIGNMENT_FIELD_ID))
  : null;

  const settings = {
  table,
  view,
  field,
  };

  if (!table || !view || !field || field.type != FieldType.MULTIPLE_RECORD_LINKS) {
  return {
    areSettingsValid: false,
    message: 'Pick a table, view, and assignment field', // TODO could make this more specific about what's wrong?
    settings,
  };
  }
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
              description="Where to store the gift-giving assignments"
            >
              <FieldPickerSynced
                table={settings.table}
                globalConfigKey={ConfigKeys.ASSIGNMENT_FIELD_ID}
                allowedTypes={[FieldType.MULTIPLE_RECORD_LINKS]}
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
