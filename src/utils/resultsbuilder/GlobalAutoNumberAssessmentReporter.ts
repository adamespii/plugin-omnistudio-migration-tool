import { GlobalAutoNumberAssessmentInfo } from '../interfaces';
import { Logger } from '../logger';
import { OmnistudioOrgDetails } from '../orgUtils';
import {
  FilterGroupParam,
  ReportHeaderGroupParam,
  ReportParam,
  ReportRowParam,
  SummaryItemDetailParam,
} from '../reportGenerator/reportInterfaces';
import { createFilterGroupParam, createRowDataParam, getOrgDetailsForReport } from '../reportGenerator/reportUtil';
import { reportingHelper } from './reportingHelper';

export class GlobalAutoNumberAssessmentReporter {
  private static rowId = 0;
  private static rowIdPrefix = 'autonumber-row-data-';

  public static getGlobalAutoNumberAssessmentData(
    globalAutoNumberAssessmentInfos: GlobalAutoNumberAssessmentInfo[],
    instanceUrl: string,
    omnistudioOrgDetails: OmnistudioOrgDetails
  ): ReportParam {
    Logger.captureVerboseData('GAN data', globalAutoNumberAssessmentInfos);

    return {
      title: 'Omni Global Auto Numbers Assessment Report',
      heading: 'Omni Global Auto Numbers Assessment Report',
      description: 'A high-level summary of the actions taken during the Omnistudio migration will appear here.',
      org: getOrgDetailsForReport(omnistudioOrgDetails),
      assessmentDate: new Date().toLocaleString(),
      reportType: 'globalautonumber',
      total: globalAutoNumberAssessmentInfos?.length || 0,
      filterGroups: this.getFilterGroupsForReport(globalAutoNumberAssessmentInfos),
      headerGroups: this.getHeaderGroupsForReport(),
      rows: this.getRowsForReport(globalAutoNumberAssessmentInfos, instanceUrl),
      rollbackFlags:
        (omnistudioOrgDetails.rollbackFlags || []).includes('RollbackIPChanges') ||
        (omnistudioOrgDetails.rollbackFlags || []).includes('RollbackDRChanges')
          ? ['RollbackIPChanges', 'RollbackDRChanges'].filter((flag) =>
              (omnistudioOrgDetails.rollbackFlags || []).includes(flag)
            )
          : undefined,
      callToAction: reportingHelper.getCallToAction(globalAutoNumberAssessmentInfos),
    };
  }

  public static getSummaryData(
    globalAutoNumberAssessmentInfos: GlobalAutoNumberAssessmentInfo[]
  ): SummaryItemDetailParam[] {
    return [
      {
        name: 'Ready for migration',
        count: globalAutoNumberAssessmentInfos.filter(
          (globalAutoNumberAssessmentInfo) =>
            this.getMigrationStatus(globalAutoNumberAssessmentInfo) === 'Ready for migration'
        ).length,
        cssClass: 'text-success',
      },
      {
        name: 'Warnings',
        count: globalAutoNumberAssessmentInfos.filter(
          (globalAutoNumberAssessmentInfo) => this.getMigrationStatus(globalAutoNumberAssessmentInfo) === 'Warnings'
        ).length,
        cssClass: 'text-warning',
      },
      {
        name: 'Needs manual intervention',
        count: globalAutoNumberAssessmentInfos.filter(
          (globalAutoNumberAssessmentInfo) =>
            this.getMigrationStatus(globalAutoNumberAssessmentInfo) === 'Needs manual intervention'
        ).length,
        cssClass: 'text-error',
      },
      {
        name: 'Failed',
        count: globalAutoNumberAssessmentInfos.filter(
          (globalAutoNumberAssessmentInfo) =>
            globalAutoNumberAssessmentInfo.errors && globalAutoNumberAssessmentInfo.errors.length > 0
        ).length,
        cssClass: 'text-error',
      },
    ];
  }

  private static getFilterGroupsForReport(
    globalAutoNumberAssessmentInfos: GlobalAutoNumberAssessmentInfo[]
  ): FilterGroupParam[] {
    if (!globalAutoNumberAssessmentInfos || globalAutoNumberAssessmentInfos.length === 0) {
      return [];
    }

    // Create filter groups based on migration status
    const statuses = new Set<string>();
    globalAutoNumberAssessmentInfos.forEach((info) => {
      const status = this.getMigrationStatus(info);
      statuses.add(status);
    });

    if (statuses.size > 0) {
      return [createFilterGroupParam('Filter By Status', 'status', Array.from(statuses))];
    }
    return [];
  }

  private static getHeaderGroupsForReport(): ReportHeaderGroupParam[] {
    return [
      {
        header: [
          {
            name: 'In Package',
            colspan: 2,
            rowspan: 1,
          },
          {
            name: 'In Core',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Assessment Status',
            colspan: 1,
            rowspan: 2,
          },
          {
            name: 'Summary',
            colspan: 1,
            rowspan: 2,
          },
        ],
      },
      {
        header: [
          {
            name: 'Name',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Record ID',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Name',
            colspan: 1,
            rowspan: 1,
          },
        ],
      },
    ];
  }

  private static getRowsForReport(
    globalAutoNumberAssessmentInfos: GlobalAutoNumberAssessmentInfo[],
    instanceUrl: string
  ): ReportRowParam[] {
    return globalAutoNumberAssessmentInfos.map((globalAutoNumberAssessmentInfo) => {
      const allMessages = [
        ...(globalAutoNumberAssessmentInfo.warnings || []),
        ...(globalAutoNumberAssessmentInfo.errors || []),
      ];

      return {
        rowId: `${this.rowIdPrefix}${this.rowId++}`,
        data: [
          createRowDataParam(
            'name',
            globalAutoNumberAssessmentInfo.oldName,
            true,
            1,
            1,
            false,
            undefined,
            undefined,
            this.getMigrationStatus(globalAutoNumberAssessmentInfo) === 'Needs manual intervention' ||
              this.getMigrationStatus(globalAutoNumberAssessmentInfo) === 'Failed'
              ? 'invalid-icon'
              : ''
          ),
          createRowDataParam(
            'id',
            globalAutoNumberAssessmentInfo.id,
            false,
            1,
            1,
            true,
            `${instanceUrl}/${globalAutoNumberAssessmentInfo.id}`
          ),
          createRowDataParam('newName', globalAutoNumberAssessmentInfo.name, false, 1, 1, false),
          createRowDataParam(
            'status',
            this.getMigrationStatus(globalAutoNumberAssessmentInfo),
            false,
            1,
            1,
            false,
            undefined,
            undefined,
            this.getMigrationStatusCssClass(globalAutoNumberAssessmentInfo)
          ),
          createRowDataParam(
            'summary',
            allMessages.length > 0 ? allMessages.join(', ') : '',
            false,
            1,
            1,
            false,
            undefined,
            allMessages
          ),
        ],
      };
    });
  }

  private static getMigrationStatus(globalAutoNumberAssessmentInfo: GlobalAutoNumberAssessmentInfo): string {
    if (globalAutoNumberAssessmentInfo.errors && globalAutoNumberAssessmentInfo.errors.length > 0) {
      return 'Needs manual intervention';
    }
    if (globalAutoNumberAssessmentInfo.warnings && globalAutoNumberAssessmentInfo.warnings.length > 0) {
      return 'Warnings';
    }
    return 'Ready for migration';
  }

  private static getMigrationStatusCssClass(globalAutoNumberAssessmentInfo: GlobalAutoNumberAssessmentInfo): string {
    if (globalAutoNumberAssessmentInfo.errors && globalAutoNumberAssessmentInfo.errors.length > 0) {
      return 'text-error';
    }
    if (globalAutoNumberAssessmentInfo.warnings && globalAutoNumberAssessmentInfo.warnings.length > 0) {
      return 'text-warning';
    }
    return 'text-success';
  }
}
