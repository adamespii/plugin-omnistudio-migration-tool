/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DuplicateKeyError,
  KeyNotFoundInStorageError,
  ProcessingError,
  TargetPropertyNotFoundError,
} from '../../error/errorInterfaces';
import {
  Flexipage,
  FlexiComponentInstanceProperty,
  OmniScriptStorage,
  FlexcardStorage,
  OmniScriptStandardKey,
} from '../../migration/interfaces';
import { StorageUtil } from '../storageUtil';
import { isStandardDataModel } from '../dataModelService';

/** Component name to look for during transformation */
const lookupComponentName = 'vlocityLWCOmniWrapper';

/** Legacy runtime wrapper component names (used for detection in standard data model) */
const targetComponentNameOS = 'runtime_omnistudio:omniscript';
const targetComponentNameFlexCard = 'runtime_omnistudio:flexcard';

/** Target component name - Lightning OmniScript wrapper (introduced in 260) */
const lightningTargetComponentNameOS = 'lightning:omnistudioOmniscript';
/** Target identifier - Lightning OmniScript wrapper */
const lightningTargetIdentifierOS = 'lightning_omnistudioOmniscript';

/** Target component name - Lightning FlexCard wrapper (introduced in 260) */
const lightningTargetComponentNameFlexCard = 'lightning:omnistudioFlexcard';
/** Target identifier - Lightning FlexCard wrapper */
const lightningTargetIdentifierFlexCard = 'lightning_omnistudioFlexcard';

let osSeq = 1;
let fcSeq = 1;

const flexCardPrefix = 'cf';

/**
 * Transforms a Flexipage bundle by replacing vlocityLWCOmniWrapper components
 * with runtime_omnistudio:omniscript components and updating their properties.
 *
 * This function performs the following transformations:
 * - Identifies vlocityLWCOmniWrapper components within the specified namespace
 * - Removes the 'target' property from component instance properties
 * - Creates new properties for language, subType, theme, and type
 * - Updates the component name and identifier to the target runtime component
 *
 * @param ogBundle - The original Flexipage bundle to transform
 * @param namespace - The namespace to filter components by
 * @returns The transformed Flexipage bundle if changes were made, or false if no changes were needed
 * @throws Error if the 'target' property is not found for a component
 */
export function transformFlexipageBundle(
  ogBundle: Flexipage,
  namespace: string,
  mode: 'assess' | 'migrate'
): Flexipage | boolean {
  osSeq = 1;
  fcSeq = 1;

  const bundle: Flexipage = JSON.parse(JSON.stringify(ogBundle)) as Flexipage;
  let changes = false;

  for (const region of bundle.flexiPageRegions) {
    if (!region.itemInstances) {
      continue;
    }
    for (const item of region.itemInstances) {
      const componentName = item?.componentInstance?.componentName;

      // Handle legacy vlocityLWCOmniWrapper components
      if (componentName?.split(':')[0] === namespace && componentName?.split(':')[1] === lookupComponentName) {
        const typeSubtypeLanguage = item.componentInstance?.componentInstanceProperties?.find?.(
          (prop) => prop.name === 'target'
        )?.value;
        if (!typeSubtypeLanguage) {
          throw new TargetPropertyNotFoundError(item.componentInstance.componentName);
        }
        const newPropsWithComponentNameAndIdentifier = createNewProps(
          typeSubtypeLanguage.split(':')[1],
          namespace,
          mode,
          item.componentInstance.componentInstanceProperties
        );
        const newProps = newPropsWithComponentNameAndIdentifier.props;
        const targetComponentName = newPropsWithComponentNameAndIdentifier.componentName;
        const targetIdentifier = newPropsWithComponentNameAndIdentifier.identifier;
        changes = true;
        item.componentInstance.componentInstanceProperties = Object.entries(newProps).map(
          ([key, value]: [string, string]) => ({ name: key, value })
        );
        item.componentInstance.componentName = targetComponentName;
        item.componentInstance.identifier = targetIdentifier;
      }
      // Handle standard data model components (both runtime_omnistudio and lightning wrappers)
      else if (
        isStandardDataModel() &&
        (componentName === targetComponentNameOS || componentName === lightningTargetComponentNameOS)
      ) {
        const currentType = item.componentInstance?.componentInstanceProperties?.find(
          (prop) => prop.name === 'type'
        )?.value;
        const currentSubType = item.componentInstance?.componentInstanceProperties?.find(
          (prop) => prop.name === 'subType'
        )?.value;
        const currentLanguage = item.componentInstance?.componentInstanceProperties?.find(
          (prop) => prop.name === 'language'
        )?.value;

        if (!currentType || !currentSubType || !currentLanguage) {
          continue;
        }

        const newProps = createNewPropsForStandardOmniScript(currentType, currentSubType, currentLanguage, mode);
        changes = true;

        // Update only the specific properties that need to be changed
        Object.entries(newProps).forEach(([key, value]) => {
          const existingProp = item.componentInstance.componentInstanceProperties.find((prop) => prop.name === key);
          if (existingProp) {
            existingProp.value = value;
          }
        });
      } else if (
        isStandardDataModel() &&
        (componentName === targetComponentNameFlexCard || componentName === lightningTargetComponentNameFlexCard)
      ) {
        const currentFlexCardName = item.componentInstance?.componentInstanceProperties?.find(
          (prop) => prop.name === 'flexcardName'
        )?.value;

        if (!currentFlexCardName) {
          continue;
        }

        const newProps = createNewPropsForStandardFlexCard(currentFlexCardName, mode);
        changes = true;

        // Update only the specific properties that need to be changed
        Object.entries(newProps).forEach(([key, value]) => {
          const existingProp = item.componentInstance.componentInstanceProperties.find((prop) => prop.name === key);
          if (existingProp) {
            existingProp.value = value;
          }
        });
      }
    }
  }

  return changes ? bundle : false;
}

/**
 * Creates new properties for the transformed component.
 * TODO: This function will be updated after Aastha's utility is available.
 *
 * @param _property - The original property value (currently unused)
 * @returns Object containing the new properties for the transformed component
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createNewProps(
  nameKey: string,
  namespace: string,
  mode: 'assess' | 'migrate',
  componentInstanceProperties: FlexiComponentInstanceProperty[]
): { componentName: string; identifier: string; props: Record<string, string> } {
  if (nameKey.startsWith(flexCardPrefix)) {
    return createNewPropsForFlexCard(nameKey.substring(flexCardPrefix.length).toLowerCase(), namespace, mode);
  }
  return createNewPropsForOmniScript(nameKey.toLowerCase(), namespace, mode, componentInstanceProperties);
}

function createNewPropsForOmniScript(
  nameKey: string,
  namespace: string,
  mode: 'assess' | 'migrate',
  componentInstanceProperties: FlexiComponentInstanceProperty[]
): { componentName: string; identifier: string; props: Record<string, string> } {
  let migratedScriptName: OmniScriptStorage;
  if (mode === 'assess') {
    migratedScriptName = StorageUtil.getOmnistudioAssessmentStorage().osStorage.get(nameKey);
  } else {
    migratedScriptName = StorageUtil.getOmnistudioMigrationStorage().osStorage.get(nameKey);
  }

  if (!migratedScriptName) {
    throw new KeyNotFoundInStorageError(nameKey, 'Omniscript');
  }

  if (!migratedScriptName.migrationSuccess) {
    throw new ProcessingError(nameKey, 'Omniscript');
  }

  if (migratedScriptName.isDuplicate) {
    throw new DuplicateKeyError(nameKey, 'Omniscript');
  }

  const newProps = {
    language: migratedScriptName.language || 'English',
    subType: migratedScriptName.subtype,
    type: migratedScriptName.type,
    theme: componentInstanceProperties.find((prop) => prop.name === 'layout')?.value || 'lightning',
    inlineVariant: 'brand',
    inlineLabel: '',
    display: 'Display OmniScript on page',
    direction: 'ltr',
  };

  return {
    componentName: lightningTargetComponentNameOS,
    identifier: `${lightningTargetIdentifierOS}${osSeq++}`,
    props: newProps,
  };
}

function createNewPropsForFlexCard(
  nameKey: string,
  namespace: string,
  mode: 'assess' | 'migrate'
): { componentName: string; identifier: string; props: Record<string, string> } {
  let migratedCardName: FlexcardStorage;
  if (mode === 'assess') {
    migratedCardName = StorageUtil.getOmnistudioAssessmentStorage().fcStorage.get(nameKey);
  } else {
    migratedCardName = StorageUtil.getOmnistudioMigrationStorage().fcStorage.get(nameKey);
  }

  if (!migratedCardName) {
    throw new KeyNotFoundInStorageError(nameKey, 'Flexcard');
  }

  if (!migratedCardName.migrationSuccess) {
    throw new ProcessingError(nameKey, 'Flexcard');
  }

  if (migratedCardName.isDuplicate) {
    throw new DuplicateKeyError(nameKey, 'Flexcard');
  }

  const newProps = {
    flexcardName: migratedCardName.name,
  };

  return {
    componentName: lightningTargetComponentNameFlexCard,
    identifier: `${lightningTargetIdentifierFlexCard}${fcSeq++}`,
    props: newProps,
  };
}

/**
 * Creates new properties for standard data model OmniScript components using osStandardStorage
 */
function createNewPropsForStandardOmniScript(
  currentType: string,
  currentSubType: string,
  currentLanguage: string,
  mode: 'assess' | 'migrate'
): Record<string, string> {
  // Get storage based on mode
  const storage =
    mode === 'assess' ? StorageUtil.getOmnistudioAssessmentStorage() : StorageUtil.getOmnistudioMigrationStorage();

  // Create the OmniScriptStandardKey object for lookup in osStandardStorage
  const lookupKey: OmniScriptStandardKey = {
    type: currentType,
    subtype: currentSubType,
    language: currentLanguage,
  };

  // Look up in osStandardStorage using the object key
  const targetDataFromStorage: OmniScriptStorage | undefined = StorageUtil.getStandardOmniScript(storage, lookupKey);

  const nameKey = `${currentType}_${currentSubType}_${currentLanguage}`;

  if (!targetDataFromStorage) {
    throw new KeyNotFoundInStorageError(nameKey, 'Omniscript');
  }

  if (!targetDataFromStorage.migrationSuccess) {
    throw new ProcessingError(nameKey, 'Omniscript');
  }

  // Return the new properties
  return {
    type: targetDataFromStorage.type,
    subType: targetDataFromStorage.subtype,
    language: targetDataFromStorage.language,
  };
}

/**
 * Creates new properties for standard data model FlexCard components using fcStorage
 */
function createNewPropsForStandardFlexCard(
  currentFlexCardName: string,
  mode: 'assess' | 'migrate'
): Record<string, string> {
  // Get storage based on mode
  const storage =
    mode === 'assess' ? StorageUtil.getOmnistudioAssessmentStorage() : StorageUtil.getOmnistudioMigrationStorage();

  // Look up in fcStorage
  const targetDataFromStorage: FlexcardStorage | undefined = storage.fcStorage.get(currentFlexCardName.toLowerCase());

  if (!targetDataFromStorage) {
    throw new KeyNotFoundInStorageError(currentFlexCardName, 'Flexcard');
  }

  if (targetDataFromStorage.isDuplicate) {
    throw new DuplicateKeyError(currentFlexCardName, 'Flexcard');
  }

  if (!targetDataFromStorage.migrationSuccess) {
    throw new ProcessingError(currentFlexCardName, 'Flexcard');
  }

  if (targetDataFromStorage.error) {
    throw new Error(targetDataFromStorage.error.join('\n\n'));
  }

  // Return the new properties
  return {
    flexcardName: targetDataFromStorage.name,
  };
}
