/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ExperienceSiteAssessmentInfo, ExperienceSiteAssessmentPageInfo } from '../interfaces';
import { Logger } from '../logger';
import { FileDiffUtil } from '../lwcparser/fileutils/FileDiffUtil';
import { OmnistudioOrgDetails } from '../orgUtils';
import {
  FilterGroupParam,
  ReportDataParam,
  ReportHeaderGroupParam,
  ReportParam,
  ReportRowParam,
  SummaryItemDetailParam,
} from '../reportGenerator/reportInterfaces';
import { createFilterGroupParam, createRowDataParam, getOrgDetailsForReport } from '../reportGenerator/reportUtil';

export class ExperienceSiteAssessmentReporter {
  private static experienceSiteFileSuffix = '.json';

  private static rowId = 0;
  private static rowIdPrefix = 'experiencesite-row-data-';

  public static getExperienceSiteAssessmentData(
    experienceSiteAssessmentInfos: ExperienceSiteAssessmentInfo[],
    omnistudioOrgDetails: OmnistudioOrgDetails
  ): ReportParam {
    return {
      title: 'Experience Cloud Site Pages Assessment Report',
      heading: 'Experience Cloud Site Pages Assessment Report',
      description: 'A high-level summary of the actions taken during the Omnistudio migration will appear here.',
      org: getOrgDetailsForReport(omnistudioOrgDetails),
      assessmentDate: new Date().toLocaleString(),
      total: experienceSiteAssessmentInfos?.length || 0,
      filterGroups: this.getFilterGroupsForReport(experienceSiteAssessmentInfos),
      headerGroups: this.getHeaderGroupsForReport(),
      rows: this.getRowsForReport(experienceSiteAssessmentInfos),
      props: JSON.stringify({
        recordName: 'Pages',
        rowBased: true,
        rowCount: true,
      }),
    };
  }

  public static getSummaryData(
    experienceSiteAssessmentInfos: ExperienceSiteAssessmentInfo[]
  ): SummaryItemDetailParam[] {
    return [
      {
        name: 'Ready for migration',
        count: experienceSiteAssessmentInfos
          .flatMap((info) => info.experienceSiteAssessmentPageInfos)
          .filter((info) => info.status === 'Ready for migration').length,
        cssClass: 'text-success',
      },
      {
        name: 'Warnings',
        count: 0,
        cssClass: 'text-warning',
      },
      {
        name: 'Needs manual intervention',
        count: experienceSiteAssessmentInfos
          .flatMap((info) => info.experienceSiteAssessmentPageInfos)
          .filter((info) => info.status === 'Needs manual intervention').length,
        cssClass: 'text-error',
      },
      {
        name: 'Failed',
        count: experienceSiteAssessmentInfos
          .flatMap((info) => info.experienceSiteAssessmentPageInfos)
          .filter((info) => info.status === 'Failed').length,
        cssClass: 'text-error',
      },
    ];
  }

  private static getRowsForReport(experienceSiteAssessmentInfos: ExperienceSiteAssessmentInfo[]): ReportRowParam[] {
    if (!experienceSiteAssessmentInfos || experienceSiteAssessmentInfos.length === 0) {
      return [];
    }
    experienceSiteAssessmentInfos
      .flatMap((info) => info.experienceSiteAssessmentPageInfos)
      .forEach((apexAssessmentInfo) => {
        const diffString = FileDiffUtil.getDiffHTML(apexAssessmentInfo.diff, apexAssessmentInfo.name);
        Logger.logVerbose('The diff is' + JSON.stringify(diffString));
      });

    const rows: ReportRowParam[] = [];

    experienceSiteAssessmentInfos.forEach((siteInfo) => {
      const rId = `${this.rowIdPrefix}${this.rowId++}`;
      let showBundleName = true;

      siteInfo.experienceSiteAssessmentPageInfos.forEach((pageInfo) => {
        rows.push({
          rowId: rId,
          data: this.getRowDataForReportRow(pageInfo, siteInfo, showBundleName),
        });
        showBundleName = false;
      });
    });

    return rows;
  }

  private static getRowDataForReportRow(
    pageInfo: ExperienceSiteAssessmentPageInfo,
    siteInfo: ExperienceSiteAssessmentInfo,
    showBundleName: boolean
  ): ReportDataParam[] {
    return [
      createRowDataParam(
        'name',
        siteInfo.experienceBundleName,
        true,
        siteInfo.experienceSiteAssessmentPageInfos.length,
        1,
        false,
        undefined,
        undefined,
        showBundleName ? '' : 'no-display'
      ),
      createRowDataParam('pageName', pageInfo.name, false, 1, 1, false, undefined, undefined),
      createRowDataParam('path', pageInfo.name + this.experienceSiteFileSuffix, false, 1, 1, true, pageInfo.path),
      createRowDataParam(
        'status',
        pageInfo.status,
        false,
        1,
        1,
        false,
        undefined,
        undefined,
        pageInfo.status === 'Ready for migration' ? 'text-success' : 'text-error'
      ),
      createRowDataParam(
        'diff',
        pageInfo.name + 'diff',
        false,
        1,
        1,
        false,
        undefined,
        FileDiffUtil.getDiffHTML(pageInfo.diff, pageInfo.name),
        'diff-cell'
      ),
      createRowDataParam(
        'summary',
        pageInfo.warnings ? pageInfo.warnings.join(', ') : '',
        false,
        1,
        1,
        false,
        undefined,
        pageInfo.warnings
      ),
    ];
  }

  private static getHeaderGroupsForReport(): ReportHeaderGroupParam[] {
    return [
      {
        header: [
          {
            name: 'Experience Cloud Site Name',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Page Name',
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
            rowspan: 1,
          },
          {
            name: 'Differences',
            colspan: 1,
            rowspan: 1,
          },
          {
            name: 'Summary',
            colspan: 1,
            rowspan: 1,
          },
        ],
      },
    ];
  }

  private static getFilterGroupsForReport(
    experienceSiteAssessmentInfos: ExperienceSiteAssessmentInfo[]
  ): FilterGroupParam[] {
    const distinctStatuses = [
      ...new Set(
        experienceSiteAssessmentInfos
          .flatMap((info) => info.experienceSiteAssessmentPageInfos)
          .map((info) => info.status)
      ),
    ];
    const statusFilterGroupParam: FilterGroupParam[] =
      distinctStatuses.length > 0 && distinctStatuses.filter((status) => status).length > 0
        ? [createFilterGroupParam('Filter By Assessment Status', 'status', distinctStatuses)]
        : [];

    return [...statusFilterGroupParam];
  }
}
