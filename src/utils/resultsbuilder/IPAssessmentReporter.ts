import { isStandardDataModel } from '../dataModelService';
import { IPAssessmentInfo } from '../interfaces';
import { Logger } from '../logger';
import { OmnistudioOrgDetails } from '../orgUtils';
import {
  FilterGroupParam,
  ReportHeaderGroupParam,
  ReportParam,
  ReportRowParam,
  SummaryItemDetailParam,
} from '../reportGenerator/reportInterfaces';
import {
  createFilterGroupParam,
  createRowDataParam,
  getAssessmentReportNameHeaders,
  getOrgDetailsForReport,
} from '../reportGenerator/reportUtil';
import { reportingHelper } from './reportingHelper';

export class IPAssessmentReporter {
  private static rowId = 0;
  private static rowIdPrefix = 'ip-row-data-';
  public static getIntegrationProcedureAssessmentData(
    ipAssessmentInfos: IPAssessmentInfo[],
    instanceUrl: string,
    omnistudioOrgDetails: OmnistudioOrgDetails
  ): ReportParam {
    Logger.captureVerboseData('IP data', ipAssessmentInfos);
    return {
      title: 'Integration Procedures Assessment Report',
      heading: 'Integration Procedures Assessment Report',
      description: 'A high-level summary of the actions taken during the Omnistudio migration will appear here.',
      org: getOrgDetailsForReport(omnistudioOrgDetails),
      assessmentDate: new Date().toLocaleString(),
      total: ipAssessmentInfos?.length || 0,
      filterGroups: this.getFilterGroupsForReport(ipAssessmentInfos),
      headerGroups: this.getHeaderGroupsForReport(),
      rows: this.getRowsForReport(ipAssessmentInfos, instanceUrl),
      rollbackFlags: (omnistudioOrgDetails.rollbackFlags || []).includes('RollbackIPChanges')
        ? ['RollbackIPChanges']
        : undefined,
      callToAction: reportingHelper.getCallToAction(ipAssessmentInfos),
    };
  }

  public static getSummaryData(ipAssessmentInfos: IPAssessmentInfo[]): SummaryItemDetailParam[] {
    return [
      {
        name: 'Ready for migration',
        count: ipAssessmentInfos.filter(
          (ipAssessmentInfo) => ipAssessmentInfo.migrationStatus === 'Ready for migration'
        ).length,
        cssClass: 'text-success',
      },
      {
        name: 'Warnings',
        count: ipAssessmentInfos.filter((ipAssessmentInfo) => ipAssessmentInfo.migrationStatus === 'Warnings').length,
        cssClass: 'text-warning',
      },
      {
        name: 'Needs manual intervention',
        count: ipAssessmentInfos.filter(
          (ipAssessmentInfo) => ipAssessmentInfo.migrationStatus === 'Needs manual intervention'
        ).length,
        cssClass: 'text-error',
      },
      {
        name: 'Failed',
        count: ipAssessmentInfos.filter((ipAssessmentInfo) => ipAssessmentInfo.migrationStatus === 'Failed').length,
        cssClass: 'text-error',
      },
    ];
  }

  private static getRowsForReport(ipAssessmentInfos: IPAssessmentInfo[], instanceUrl: string): ReportRowParam[] {
    return ipAssessmentInfos.map((ipAssessmentInfo) => ({
      rowId: `${this.rowIdPrefix}${this.rowId++}`,
      data: [
        createRowDataParam(
          'name',
          ipAssessmentInfo.oldName,
          true,
          1,
          1,
          false,
          undefined,
          undefined,
          ipAssessmentInfo.migrationStatus === 'Needs manual intervention' ||
            ipAssessmentInfo.migrationStatus === 'Failed'
            ? 'invalid-icon'
            : ''
        ),
        createRowDataParam('id', ipAssessmentInfo.id, false, 1, 1, true, `${instanceUrl}/${ipAssessmentInfo.id}`),
        createRowDataParam('newName', ipAssessmentInfo.name, false, 1, 1, false),
        createRowDataParam(
          'status',
          ipAssessmentInfo.migrationStatus,
          false,
          1,
          1,
          false,
          undefined,
          undefined,
          ipAssessmentInfo.migrationStatus === 'Ready for migration'
            ? 'text-success'
            : ipAssessmentInfo.migrationStatus === 'Warnings'
            ? 'text-warning'
            : 'text-error'
        ),
        createRowDataParam(
          'summary',
          ipAssessmentInfo.warnings ? ipAssessmentInfo.warnings.join(', ') : '',
          false,
          1,
          1,
          false,
          undefined,
          ipAssessmentInfo.warnings
        ),
        createRowDataParam(
          'integrationProcedureDependencies',
          ipAssessmentInfo.dependenciesIP
            ? ipAssessmentInfo.dependenciesIP.map((dependency) => dependency.name).join(', ')
            : '',
          false,
          1,
          1,
          false,
          undefined,
          ipAssessmentInfo.dependenciesIP.map((dependency) => dependency.name)
        ),
        createRowDataParam(
          'dataMapperDependencies',
          ipAssessmentInfo.dependenciesDR
            ? ipAssessmentInfo.dependenciesDR.map((dependency) => dependency.name).join(', ')
            : '',
          false,
          1,
          1,
          false,
          undefined,
          ipAssessmentInfo.dependenciesDR.map((dependency) => dependency.name)
        ),
        createRowDataParam(
          'remoteActionDependencies',
          ipAssessmentInfo.dependenciesRemoteAction
            ? ipAssessmentInfo.dependenciesRemoteAction.map((dependency) => dependency.name).join(', ')
            : '',
          false,
          1,
          1,
          false,
          undefined,
          ipAssessmentInfo.dependenciesRemoteAction.map((dependency) => dependency.name)
        ),
      ],
    }));
  }

  private static getHeaderGroupsForReport(): ReportHeaderGroupParam[] {
    const firstRowHeaders = [
      ...getAssessmentReportNameHeaders(),
      { name: 'Assessment Status', colspan: 1, rowspan: 2 },
      { name: 'Summary', colspan: 1, rowspan: 2 },
      { name: 'Integration Procedure Dependencies', colspan: 1, rowspan: 2 },
      { name: 'Data Mapper Dependencies', colspan: 1, rowspan: 2 },
      { name: 'Remote Action Dependencies', colspan: 1, rowspan: 2 },
    ];

    const nameLabel = isStandardDataModel() ? 'Updated Name' : 'Name';

    const secondRowHeaders = [
      { name: 'Name', colspan: 1, rowspan: 1 },
      { name: 'ID', colspan: 1, rowspan: 1 },
      { name: nameLabel, colspan: 1, rowspan: 1 },
    ];

    return [{ header: firstRowHeaders }, { header: secondRowHeaders }];
  }

  private static getFilterGroupsForReport(ipAssessmentInfo: IPAssessmentInfo[]): FilterGroupParam[] {
    if (!ipAssessmentInfo || ipAssessmentInfo.length === 0) {
      return [];
    }

    // Get distinct status from IPAssessmentInfo
    const distinctStatuses = [...new Set(ipAssessmentInfo.map((info) => info.migrationStatus))];
    const statusFilterGroupParam: FilterGroupParam[] =
      distinctStatuses.length > 0 && distinctStatuses.filter((status) => status).length > 0
        ? [createFilterGroupParam('Filter By Assessment Status', 'status', distinctStatuses)]
        : [];

    return [...statusFilterGroupParam];
  }
}
