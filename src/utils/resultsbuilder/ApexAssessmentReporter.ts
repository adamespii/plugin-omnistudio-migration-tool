import { ApexAssessmentInfo } from '../interfaces';
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
import { FileDiffUtil } from '../lwcparser/fileutils/FileDiffUtil';
import { reportingHelper } from './reportingHelper';

export class ApexAssessmentReporter {
  private static rowId = 0;
  private static rowIdPrefix = 'apex-row-data-';
  public static getApexAssessmentData(
    apexAssessmentInfos: ApexAssessmentInfo[],
    omnistudioOrgDetails: OmnistudioOrgDetails
  ): ReportParam {
    Logger.captureVerboseData('apex data:', apexAssessmentInfos);
    return {
      title: 'Apex Classes Assessment Report',
      heading: 'Apex Classes Assessment Report',
      description: 'A high-level summary of the actions taken during the Omnistudio migration will appear here.',
      org: getOrgDetailsForReport(omnistudioOrgDetails),
      assessmentDate: new Date().toLocaleString(),
      total: apexAssessmentInfos?.length || 0,
      filterGroups: this.getFilterGroupsForReport(apexAssessmentInfos),
      headerGroups: this.getHeaderGroupsForReport(),
      rows: this.getRowsForReport(apexAssessmentInfos),
      callToAction: reportingHelper.getCallToAction(apexAssessmentInfos),
    };
  }

  public static getSummaryData(apexAssessmentInfos: ApexAssessmentInfo[]): SummaryItemDetailParam[] {
    return [
      {
        name: 'Ready for migration',
        count: apexAssessmentInfos.filter((apexAssessmentInfo) => apexAssessmentInfo.status === 'Ready for migration')
          .length,
        cssClass: 'text-success',
      },
      {
        name: 'Warnings',
        count: apexAssessmentInfos.filter((info) => info.status === 'Warnings').length,
        cssClass: 'text-warning',
      },
      {
        name: 'Needs manual intervention',
        count: apexAssessmentInfos.filter((info) => info.status === 'Needs manual intervention').length,
        cssClass: 'text-error',
      },
      {
        name: 'Failed',
        count: apexAssessmentInfos.filter((info) => info.status === 'Failed').length,
        cssClass: 'text-error',
      },
    ];
  }

  private static getRowsForReport(apexAssessmentInfos: ApexAssessmentInfo[]): ReportRowParam[] {
    return apexAssessmentInfos.map((apexAssessmentInfo) => ({
      rowId: `${this.rowIdPrefix}${this.rowId++}`,
      data: [
        createRowDataParam(
          'name',
          apexAssessmentInfo.name,
          true,
          1,
          1,
          false,
          undefined,
          undefined,
          apexAssessmentInfo.status === 'Needs manual intervention' || apexAssessmentInfo.status === 'Failed'
            ? 'invalid-icon'
            : ''
        ),
        createRowDataParam(
          'fileReference',
          apexAssessmentInfo.name,
          false,
          1,
          1,
          true,
          apexAssessmentInfo.path,
          apexAssessmentInfo.name + '.cls'
        ),
        createRowDataParam(
          'status',
          apexAssessmentInfo.status,
          false,
          1,
          1,
          false,
          undefined,
          apexAssessmentInfo.status,
          this.getMigrationStatusCssClass(apexAssessmentInfo.status)
        ),
        createRowDataParam(
          'diff',
          apexAssessmentInfo.name + 'diff',
          false,
          1,
          1,
          false,
          undefined,
          FileDiffUtil.getDiffHTML(apexAssessmentInfo.diff, apexAssessmentInfo.name),
          'diff-cell'
        ),
        createRowDataParam(
          'comments',
          apexAssessmentInfo.infos ? apexAssessmentInfo.infos.join(', ') : '',
          false,
          1,
          1,
          false,
          undefined,
          [...apexAssessmentInfo.infos, ...apexAssessmentInfo.warnings]
        ),
        createRowDataParam(
          'errors',
          apexAssessmentInfo.errors ? apexAssessmentInfo.errors.join(', ') : '',
          false,
          1,
          1,
          false,
          undefined,
          apexAssessmentInfo.errors
        ),
      ],
    }));
  }
  private static getMigrationStatusCssClass(status: string, noClassForSuccess = false): string {
    switch (status) {
      case 'Warnings':
        return 'text-warning';
      case 'Needs manual intervention':
        return 'text-error';
      case 'Failed':
        return 'text-error';
    }

    return noClassForSuccess ? '' : 'text-success';
  }

  private static getFilterGroupsForReport(apexAssessmentInfos: ApexAssessmentInfo[]): FilterGroupParam[] {
    if (!apexAssessmentInfos || apexAssessmentInfos.length === 0) {
      return [];
    }

    const distinctStatuses = Array.from(new Set(apexAssessmentInfos.map((info) => info.status)));
    const statusFilterGroupParam: FilterGroupParam[] =
      distinctStatuses.length > 0 && distinctStatuses.filter((status) => status).length > 0
        ? [createFilterGroupParam('Filter By Assessment Status', 'status', distinctStatuses)]
        : [];

    return [...statusFilterGroupParam];
  }

  private static getHeaderGroupsForReport(): ReportHeaderGroupParam[] {
    return [
      {
        header: [
          {
            name: 'Name',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'File Reference',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Assessment Status',
            colspan: 1,
            rowspan: 2,
          },
          {
            name: 'Code Difference',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Summary',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Errors',
            colspan: 1,
            rowspan: 1,
          },
        ],
      },
    ];
  }
}
