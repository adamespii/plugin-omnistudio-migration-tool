import { expect } from 'chai';
import sinon = require('sinon');
import { transformFlexipageBundle } from '../../../src/utils/flexipage/flexiPageTransformer';
import {
  Flexipage,
  FlexiPageRegion,
  FlexiItemInstance,
  FlexiComponentInstance,
  FlexiComponentInstanceProperty,
} from '../../../src/migration/interfaces';
import { StorageUtil } from '../../../src/utils/storageUtil';
import * as dataModelService from '../../../src/utils/dataModelService';

describe('transformFlexipageBundle', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const namespace = 'clocity_ins';
  const lookupComponentName = 'vlocityLWCOmniWrapper';

  // Target component names after transformation
  const targetComponentNameOS = 'runtime_omnistudio:omniscript';
  const targetComponentNameFC = 'runtime_omnistudio:flexcard';

  function makeComponentInstance(props: FlexiComponentInstanceProperty[], name?: string): FlexiComponentInstance {
    return {
      componentInstanceProperties: props,
      componentName: name || `${namespace}:${lookupComponentName}`,
    };
  }

  function makeItemInstance(props: FlexiComponentInstanceProperty[], name?: string): FlexiItemInstance {
    return {
      componentInstance: makeComponentInstance(props, name),
    };
  }

  function makeRegion(itemInstances: FlexiItemInstance[]): FlexiPageRegion {
    return {
      itemInstances,
    };
  }

  it('transforms a matching component and returns a changed bundle', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'other', value: 'bar' },
          ]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;
    const item = changed.flexiPageRegions[0].itemInstances[0];
    expect(item.componentInstance.componentName).to.equal(targetComponentNameOS);
    expect(item.componentInstance.identifier).to.equal('runtime_omnistudio_omniscript1');
    // Should not have 'target' property
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'target')).to.be.undefined;
    // Should have new properties
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'language')).to.exist;
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'type')).to.exist;
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'subType')).to.exist;
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'theme')).to.exist;
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'inlineVariant')).to.exist;
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'inlineLabel')).to.exist;
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'display')).to.exist;
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'direction')).to.exist;
    // Should not keep other properties (implementation replaces all properties)
    expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'other')).to.be.undefined;
  });

  it('passes through prefill property when present in source OmniScript component', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'prefill', value: '{"AccountId":"{!recordId}"}' },
            { name: 'layout', value: 'lightning' },
          ]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;
    const item = changed.flexiPageRegions[0].itemInstances[0];

    expect(item.componentInstance.componentName).to.equal(targetComponentNameOS);
    // Verify prefill is passed through
    const prefillProp = item.componentInstance.componentInstanceProperties.find((p) => p.name === 'prefill');
    expect(prefillProp).to.exist;
    expect(prefillProp.value).to.equal('{"AccountId":"{!recordId}"}');
  });

  it('passes through recordId property when present in source OmniScript component', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'recordId', value: '{!recordId}' },
            { name: 'layout', value: 'lightning' },
          ]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;
    const item = changed.flexiPageRegions[0].itemInstances[0];

    expect(item.componentInstance.componentName).to.equal(targetComponentNameOS);
    // Verify recordId is passed through
    const recordIdProp = item.componentInstance.componentInstanceProperties.find((p) => p.name === 'recordId');
    expect(recordIdProp).to.exist;
    expect(recordIdProp.value).to.equal('{!recordId}');
  });

  it('does not include prefill property when not present in source component', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'layout', value: 'lightning' },
          ]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;
    const item = changed.flexiPageRegions[0].itemInstances[0];

    // Verify prefill is NOT present when not in source
    const prefillProp = item.componentInstance.componentInstanceProperties.find((p) => p.name === 'prefill');
    expect(prefillProp).to.be.undefined;
  });

  it('passes through prefill property in assess mode', () => {
    // Mock StorageUtil for assess mode
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioAssessmentStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'prefill', value: '{"CaseId":"{!caseId}"}' },
            { name: 'layout', value: 'lightning' },
          ]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'assess');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;
    const item = changed.flexiPageRegions[0].itemInstances[0];

    expect(item.componentInstance.componentName).to.equal(targetComponentNameOS);
    // Verify prefill is passed through in assess mode
    const prefillProp = item.componentInstance.componentInstanceProperties.find((p) => p.name === 'prefill');
    expect(prefillProp).to.exist;
    expect(prefillProp.value).to.equal('{"CaseId":"{!caseId}"}');
  });

  it('passes through recordId and objectApiName for FlexCard components', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map(),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        ['testcard', { name: 'TestCard', originalName: 'TestCard', isDuplicate: false, migrationSuccess: true }],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:cfTestCard' },
            { name: 'recordId', value: '{!recordId}' },
            { name: 'objectApiName', value: 'Account' },
          ]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;
    const item = changed.flexiPageRegions[0].itemInstances[0];

    expect(item.componentInstance.componentName).to.equal(targetComponentNameFC);
    // Verify passthrough props
    const recordIdProp = item.componentInstance.componentInstanceProperties.find((p) => p.name === 'recordId');
    expect(recordIdProp).to.exist;
    expect(recordIdProp.value).to.equal('{!recordId}');
    const objectApiNameProp = item.componentInstance.componentInstanceProperties.find(
      (p) => p.name === 'objectApiName'
    );
    expect(objectApiNameProp).to.exist;
    expect(objectApiNameProp.value).to.equal('Account');
  });

  it('returns false if no matching component', () => {
    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([makeItemInstance([{ name: 'target', value: 'foo' }], 'othernamespace:otherComponent')]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.equal(false);
  });

  it('throws if target property is missing', () => {
    const bundle: Flexipage = {
      flexiPageRegions: [makeRegion([makeItemInstance([{ name: 'other', value: 'bar' }])])],
    };
    expect(() => transformFlexipageBundle(bundle, namespace, 'migrate')).to.throw(
      'Target property not found for component clocity_ins:vlocityLWCOmniWrapper'
    );
  });

  it('does not mutate the original bundle', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'other', value: 'bar' },
          ]),
        ]),
      ],
    };
    const original = JSON.stringify(bundle);
    transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(JSON.stringify(bundle)).to.equal(original);
  });

  it('generates sequential IDs for multiple OmniScript components on the same page', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype1',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
        [
          'subtype2',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
        [
          'subtype3',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([{ name: 'target', value: 'type:subtype1' }]),
          makeItemInstance([{ name: 'target', value: 'type:subtype2' }]),
          makeItemInstance([{ name: 'target', value: 'type:subtype3' }]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;

    // Check sequential IDs
    expect(changed.flexiPageRegions[0].itemInstances[0].componentInstance.identifier).to.equal(
      'runtime_omnistudio_omniscript1'
    );
    expect(changed.flexiPageRegions[0].itemInstances[1].componentInstance.identifier).to.equal(
      'runtime_omnistudio_omniscript2'
    );
    expect(changed.flexiPageRegions[0].itemInstances[2].componentInstance.identifier).to.equal(
      'runtime_omnistudio_omniscript3'
    );
  });

  it('generates sequential IDs for multiple FlexCard components on the same page', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map(),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        [
          'card1',
          {
            name: 'Card1',
            originalName: 'Card1',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
        ['card2', { name: 'Card2', originalName: 'Card2', isDuplicate: false, migrationSuccess: true }],
        [
          'card3',
          {
            name: 'Card3',
            originalName: 'Card3',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([{ name: 'target', value: 'type:cfcard1' }]),
          makeItemInstance([{ name: 'target', value: 'type:cfcard2' }]),
          makeItemInstance([{ name: 'target', value: 'type:cfcard3' }]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;

    // Check sequential IDs for FlexCards
    expect(changed.flexiPageRegions[0].itemInstances[0].componentInstance.identifier).to.equal(
      'runtime_omnistudio_flexcard1'
    );
    expect(changed.flexiPageRegions[0].itemInstances[1].componentInstance.identifier).to.equal(
      'runtime_omnistudio_flexcard2'
    );
    expect(changed.flexiPageRegions[0].itemInstances[2].componentInstance.identifier).to.equal(
      'runtime_omnistudio_flexcard3'
    );
  });

  it('generates sequential IDs for mixed OmniScript and FlexCard components on the same page', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype1',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
        [
          'subtype2',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        ['card1', { name: 'Card1', originalName: 'Card1', isDuplicate: false, migrationSuccess: true }],
        ['card2', { name: 'Card2', originalName: 'Card2', isDuplicate: false, migrationSuccess: true }],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([{ name: 'target', value: 'type:subtype1' }]),
          makeItemInstance([{ name: 'target', value: 'type:cfcard1' }]),
          makeItemInstance([{ name: 'target', value: 'type:subtype2' }]),
          makeItemInstance([{ name: 'target', value: 'type:cfcard2' }]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;

    // Check sequential IDs for mixed components
    expect(changed.flexiPageRegions[0].itemInstances[0].componentInstance.identifier).to.equal(
      'runtime_omnistudio_omniscript1'
    );
    expect(changed.flexiPageRegions[0].itemInstances[1].componentInstance.identifier).to.equal(
      'runtime_omnistudio_flexcard1'
    );
    expect(changed.flexiPageRegions[0].itemInstances[2].componentInstance.identifier).to.equal(
      'runtime_omnistudio_omniscript2'
    );
    expect(changed.flexiPageRegions[0].itemInstances[3].componentInstance.identifier).to.equal(
      'runtime_omnistudio_flexcard2'
    );
  });

  it('resets sequence counters for different pages', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype1',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
        [
          'subtype2',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        ['card1', { name: 'Card1', originalName: 'Card1', isDuplicate: false, migrationSuccess: true }],
        ['card2', { name: 'Card2', originalName: 'Card2', isDuplicate: false, migrationSuccess: true }],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    // First page
    const bundle1: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([{ name: 'target', value: 'type:subtype1' }]),
          makeItemInstance([{ name: 'target', value: 'type:cfcard1' }]),
        ]),
      ],
    };
    const result1 = transformFlexipageBundle(bundle1, namespace, 'migrate');
    expect(result1).to.not.equal(false);
    const changed1 = result1 as Flexipage;

    // Second page
    const bundle2: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([{ name: 'target', value: 'type:subtype2' }]),
          makeItemInstance([{ name: 'target', value: 'type:cfcard2' }]),
        ]),
      ],
    };
    const result2 = transformFlexipageBundle(bundle2, namespace, 'migrate');
    expect(result2).to.not.equal(false);
    const changed2 = result2 as Flexipage;

    // Check that sequence counters reset for second page
    expect(changed1.flexiPageRegions[0].itemInstances[0].componentInstance.identifier).to.equal(
      'runtime_omnistudio_omniscript1'
    );
    expect(changed1.flexiPageRegions[0].itemInstances[1].componentInstance.identifier).to.equal(
      'runtime_omnistudio_flexcard1'
    );
    expect(changed2.flexiPageRegions[0].itemInstances[0].componentInstance.identifier).to.equal(
      'runtime_omnistudio_omniscript1'
    );
    expect(changed2.flexiPageRegions[0].itemInstances[1].componentInstance.identifier).to.equal(
      'runtime_omnistudio_flexcard1'
    );
  });

  it('handles mixed case OmniScript names correctly', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map([
        [
          'mixedcase',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
        [
          'lowercase',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([{ name: 'target', value: 'type:MixedCase' }]),
          makeItemInstance([{ name: 'target', value: 'type:LowerCase' }]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;

    // All should be transformed to lowercase and find the correct storage entries
    expect(changed.flexiPageRegions[0].itemInstances[0].componentInstance.componentName).to.equal(
      targetComponentNameOS
    );
    expect(changed.flexiPageRegions[0].itemInstances[1].componentInstance.componentName).to.equal(
      targetComponentNameOS
    );
  });

  it('handles mixed case FlexCard names correctly', () => {
    // Mock StorageUtil
    const mockStorage = {
      osStorage: new Map(),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        [
          'mixedcase',
          { name: 'MixedCaseCard', originalName: 'MixedCaseCard', isDuplicate: false, migrationSuccess: true },
        ],
        [
          'lowercase',
          { name: 'lowercasecard', originalName: 'lowercasecard', isDuplicate: false, migrationSuccess: true },
        ],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([{ name: 'target', value: 'type:cfMixedCase' }]),
          makeItemInstance([{ name: 'target', value: 'type:cfLowerCase' }]),
        ]),
      ],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'migrate');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;

    // All should be transformed to lowercase and find the correct storage entries
    expect(changed.flexiPageRegions[0].itemInstances[0].componentInstance.componentName).to.equal(
      targetComponentNameFC
    );
    expect(changed.flexiPageRegions[0].itemInstances[1].componentInstance.componentName).to.equal(
      targetComponentNameFC
    );
  });

  it('works with assess mode for mixed case OmniScript names', () => {
    // Mock StorageUtil for assess mode
    const mockStorage = {
      osStorage: new Map([
        [
          'mixedcase',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: true,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioAssessmentStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [makeRegion([makeItemInstance([{ name: 'target', value: 'type:MixedCase' }])])],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'assess');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;

    expect(changed.flexiPageRegions[0].itemInstances[0].componentInstance.componentName).to.equal(
      targetComponentNameOS
    );
  });

  it('works with assess mode for mixed case FlexCard names', () => {
    // Mock StorageUtil for assess mode
    const mockStorage = {
      osStorage: new Map(),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        [
          'mixedcase',
          { name: 'MixedCaseCard', originalName: 'MixedCaseCard', isDuplicate: false, migrationSuccess: true },
        ],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioAssessmentStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [makeRegion([makeItemInstance([{ name: 'target', value: 'type:cfMixedCase' }])])],
    };
    const result = transformFlexipageBundle(bundle, namespace, 'assess');
    expect(result).to.not.equal(false);
    const changed = result as Flexipage;

    expect(changed.flexiPageRegions[0].itemInstances[0].componentInstance.componentName).to.equal(
      targetComponentNameFC
    );
  });

  it('throws ProcessingError when OmniScript migrationSuccess is false', () => {
    // Mock StorageUtil with migrationSuccess: false
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: false,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'other', value: 'bar' },
          ]),
        ]),
      ],
    };
    expect(() => transformFlexipageBundle(bundle, namespace, 'migrate')).to.throw('Key subtype can not be processed');
  });

  it('throws ProcessingError when FlexCard migrationSuccess is false', () => {
    // Mock StorageUtil with migrationSuccess: false
    const mockStorage = {
      osStorage: new Map(),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        ['card1', { name: 'Card1', originalName: 'Card1', isDuplicate: false, migrationSuccess: false }],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [makeRegion([makeItemInstance([{ name: 'target', value: 'type:cfcard1' }])])],
    };
    expect(() => transformFlexipageBundle(bundle, namespace, 'migrate')).to.throw('Key card1 can not be processed');
  });

  it('throws ProcessingError when OmniScript migrationSuccess is false in assess mode', () => {
    // Mock StorageUtil with migrationSuccess: false
    const mockStorage = {
      osStorage: new Map([
        [
          'subtype',
          {
            type: 'OSForCustomLWC',
            originalType: 'OSForCustomLWC',
            subtype: 'OSForCustomLWC',
            originalSubtype: 'OSForCustomLWC',
            language: 'English',
            originalLanguage: 'English',
            isDuplicate: false,
            migrationSuccess: false,
          },
        ],
      ]),
      osStandardStorage: new Map(),
      fcStorage: new Map(),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioAssessmentStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [
        makeRegion([
          makeItemInstance([
            { name: 'target', value: 'type:subtype' },
            { name: 'other', value: 'bar' },
          ]),
        ]),
      ],
    };
    expect(() => transformFlexipageBundle(bundle, namespace, 'assess')).to.throw('Key subtype can not be processed');
  });

  it('throws ProcessingError when FlexCard migrationSuccess is false in assess mode', () => {
    // Mock StorageUtil with migrationSuccess: false
    const mockStorage = {
      osStorage: new Map(),
      osStandardStorage: new Map(),
      fcStorage: new Map([
        ['card1', { name: 'Card1', originalName: 'Card1', isDuplicate: false, migrationSuccess: false }],
      ]),
    };
    sandbox.stub(StorageUtil, 'getOmnistudioAssessmentStorage').returns(mockStorage);

    const bundle: Flexipage = {
      flexiPageRegions: [makeRegion([makeItemInstance([{ name: 'target', value: 'type:cfcard1' }])])],
    };
    expect(() => transformFlexipageBundle(bundle, namespace, 'assess')).to.throw('Key card1 can not be processed');
  });

  describe('Standard Data Model Tests', () => {
    const standardComponentNameOS = 'runtime_omnistudio:omniscript';
    const standardComponentNameFC = 'runtime_omnistudio:flexcard';

    function makeStandardOmniScriptComponent(type: string, subType: string, language: string): FlexiItemInstance {
      return makeItemInstance(
        [
          { name: 'type', value: type },
          { name: 'subType', value: subType },
          { name: 'language', value: language },
        ],
        standardComponentNameOS
      );
    }

    function makeStandardFlexCardComponent(flexcardName: string): FlexiItemInstance {
      return makeItemInstance([{ name: 'flexcardName', value: flexcardName }], standardComponentNameFC);
    }

    it('transforms standard data model OmniScript components successfully', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map([
          [
            JSON.stringify({ type: 'TestType', subtype: 'TestSubtype', language: 'English' }),
            {
              type: 'UpdatedType',
              originalType: 'UpdatedType',
              subtype: 'UpdatedSubtype',
              originalSubtype: 'UpdatedSubtype',
              language: 'Spanish',
              originalLanguage: 'Spanish',
              isDuplicate: false,
              migrationSuccess: true,
            },
          ],
        ]),
        fcStorage: new Map(),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [makeRegion([makeStandardOmniScriptComponent('TestType', 'TestSubtype', 'English')])],
      };

      const result = transformFlexipageBundle(bundle, namespace, 'migrate');
      expect(result).to.not.equal(false);
      const changed = result as Flexipage;

      const item = changed.flexiPageRegions[0].itemInstances[0];
      expect(item.componentInstance.componentName).to.equal('runtime_omnistudio:omniscript');

      // Verify properties were updated
      expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'type')?.value).to.equal(
        'UpdatedType'
      );
      expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'subType')?.value).to.equal(
        'UpdatedSubtype'
      );
      expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'language')?.value).to.equal(
        'Spanish'
      );
    });

    it('transforms standard data model FlexCard components successfully', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map(),
        fcStorage: new Map([
          [
            'testflexcard',
            { name: 'UpdatedFlexCard', originalName: 'TestFlexCard', isDuplicate: false, migrationSuccess: true },
          ],
        ]),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [makeRegion([makeStandardFlexCardComponent('TestFlexCard')])],
      };

      const result = transformFlexipageBundle(bundle, namespace, 'migrate');
      expect(result).to.not.equal(false);
      const changed = result as Flexipage;

      const item = changed.flexiPageRegions[0].itemInstances[0];
      expect(item.componentInstance.componentName).to.equal('runtime_omnistudio:flexcard');

      // Verify properties were updated
      expect(item.componentInstance.componentInstanceProperties.find((p) => p.name === 'flexcardName')?.value).to.equal(
        'UpdatedFlexCard'
      );
    });

    it('skips standard data model OmniScript component when type attribute is missing', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map(),
        fcStorage: new Map(),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [
          makeRegion([
            makeItemInstance(
              [
                { name: 'subType', value: 'TestSubtype' },
                { name: 'language', value: 'English' },
                // Missing 'type' attribute
              ],
              standardComponentNameOS
            ),
          ]),
        ],
      };

      const result = transformFlexipageBundle(bundle, namespace, 'migrate');
      expect(result).to.equal(false); // No changes made
    });

    it('skips standard data model FlexCard component when flexcardName is missing', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map(),
        fcStorage: new Map(),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [
          makeRegion([
            makeItemInstance(
              [
                // Missing 'flexcardName' attribute
              ],
              standardComponentNameFC
            ),
          ]),
        ],
      };

      const result = transformFlexipageBundle(bundle, namespace, 'migrate');
      expect(result).to.equal(false); // No changes made
    });

    it('throws ProcessingError when standard data model OmniScript has migrationSuccess false', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil with migrationSuccess: false
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map([
          [
            JSON.stringify({ type: 'TestType', subtype: 'TestSubtype', language: 'English' }),
            {
              type: 'UpdatedType',
              originalType: 'UpdatedType',
              subtype: 'UpdatedSubtype',
              originalSubtype: 'UpdatedSubtype',
              language: 'Spanish',
              originalLanguage: 'Spanish',
              isDuplicate: false,
              migrationSuccess: false,
            },
          ],
        ]),
        fcStorage: new Map(),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [makeRegion([makeStandardOmniScriptComponent('TestType', 'TestSubtype', 'English')])],
      };

      expect(() => transformFlexipageBundle(bundle, namespace, 'migrate')).to.throw(
        'Key TestType_TestSubtype_English can not be processed'
      );
    });

    it('throws ProcessingError when standard data model FlexCard has migrationSuccess false', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil with migrationSuccess: false
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map(),
        fcStorage: new Map([
          [
            'testflexcard',
            { name: 'UpdatedFlexCard', originalName: 'TestFlexCard', isDuplicate: false, migrationSuccess: false },
          ],
        ]),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioMigrationStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [makeRegion([makeStandardFlexCardComponent('TestFlexCard')])],
      };

      expect(() => transformFlexipageBundle(bundle, namespace, 'migrate')).to.throw(
        'Key TestFlexCard can not be processed'
      );
    });

    it('throws ProcessingError when standard data model OmniScript has migrationSuccess false in assess mode', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil with migrationSuccess: false
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map([
          [
            JSON.stringify({ type: 'TestType', subtype: 'TestSubtype', language: 'English' }),
            {
              type: 'UpdatedType',
              originalType: 'UpdatedType',
              subtype: 'UpdatedSubtype',
              originalSubtype: 'UpdatedSubtype',
              language: 'Spanish',
              originalLanguage: 'Spanish',
              isDuplicate: false,
              migrationSuccess: false,
            },
          ],
        ]),
        fcStorage: new Map(),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioAssessmentStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [makeRegion([makeStandardOmniScriptComponent('TestType', 'TestSubtype', 'English')])],
      };

      expect(() => transformFlexipageBundle(bundle, namespace, 'assess')).to.throw(
        'Key TestType_TestSubtype_English can not be processed'
      );
    });

    it('throws ProcessingError when standard data model FlexCard has migrationSuccess false in assess mode', () => {
      // Mock isStandardDataModel to return true
      sandbox.stub(dataModelService, 'isStandardDataModel').returns(true);

      // Mock StorageUtil with migrationSuccess: false
      const mockStorage = {
        osStorage: new Map(),
        osStandardStorage: new Map(),
        fcStorage: new Map([
          [
            'testflexcard',
            { name: 'UpdatedFlexCard', originalName: 'TestFlexCard', isDuplicate: false, migrationSuccess: false },
          ],
        ]),
      };
      sandbox.stub(StorageUtil, 'getOmnistudioAssessmentStorage').returns(mockStorage);

      const bundle: Flexipage = {
        flexiPageRegions: [makeRegion([makeStandardFlexCardComponent('TestFlexCard')])],
      };

      expect(() => transformFlexipageBundle(bundle, namespace, 'assess')).to.throw(
        'Key TestFlexCard can not be processed'
      );
    });
  });
});
