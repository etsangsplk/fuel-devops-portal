import React, {Component} from 'react';
import {inject, observer} from 'mobx-react';
import {runInAction} from 'mobx';
import {withRouter} from 'react-router';
import {forEach, identity} from 'lodash';

import request from '../../request';
import StatusSidebar from './StatusSidebar';
import StatusDataPeriodPicker from '../StatusDataPeriodPicker';
import LineChart from '../LineChart';
import Score from '../Score';
import {dateFormattersByPeriod, formatResponseSize, formatResponseTime} from '../../chartUtils';
import {poll} from '../../decorators';

@withRouter
@inject('uiState', 'regions', 'regionHealthData')
@observer
@poll
export default class HealthSingleRegionPage extends Component {
  static async fetchData(
    {uiState, regions, regionHealthData, params: {regionName}},
    {dataPeriod = uiState.activeStatusDataPeriod} = {}
  ) {
    if (!regions.get(regionName).hasService('health')) return;
    const url = `/api/v1/region/${
      encodeURIComponent(regionName)
    }/status/health/${
      encodeURIComponent(dataPeriod)
    }`;
    const response = await request(url);
    runInAction(() => {
      forEach(response.health, (plainHealthData, serviceName) => {
        regionHealthData.update(regionName, dataPeriod, serviceName, plainHealthData);
      });
    });
  }

  fetchData() {
    return this.constructor.fetchData(this.props);
  }

  async changeDataPeriod(dataPeriod) {
    await this.constructor.fetchData(this.props, {dataPeriod});
    this.props.uiState.activeStatusDataPeriod = dataPeriod;
  }

  charts = [
    {title: 'FCI Score', key: 'fciData'},
    {title: 'API calls (per min)', key: 'apiCallsData'},
    {title: 'Response Time (ms)', key: 'responseTimeData', axisYLabelFormatter: formatResponseTime},
    {title: 'Response Size', key: 'responseSizeData', axisYLabelFormatter: formatResponseSize}
  ]

  render() {
    const {uiState, regions, regionHealthData, params} = this.props;
    const {regionName} = params;
    const services = regionHealthData.getRegionServices(regionName, uiState.activeStatusDataPeriod);
    const formatTime = dateFormattersByPeriod[uiState.activeStatusDataPeriod];

    return (
      <div>
        <StatusSidebar />
        <div className='container-fluid'>
          <h1>{'Health: ' + regionName}</h1>
          {regions.get(regionName).hasService('health') ?
            <div className='btn-toolbar'>
              <StatusDataPeriodPicker
                className='pull-right'
                onDataPeriodChange={(dataPeriod) => this.changeDataPeriod(dataPeriod)}
              />
            </div>
          :
            <div className='alert alert-warning'>
              {`Region ${regionName} doesn't have Health service.`}
            </div>
          }
          {services.map((serviceName) => {
            const health = regionHealthData.get(
              regionName, uiState.activeStatusDataPeriod, serviceName
            );
            if (!health) return null;
            return (
              <div key={serviceName} className='service-status'>
                <div className='service-status-container'>
                  <div className='service-status-entry'>
                    <div className='service-name'>{serviceName}</div>
                    <div className='service-score text-success'>
                      <Score score={health.fci} />
                    </div>
                  </div>
                  {this.charts.map(({title, key, axisXLabelFormatter, axisYLabelFormatter}) => {
                    return (
                      <div key={title} className='service-status-entry-large'>
                        <div className='chart-title'>{title}</div>
                        <LineChart
                          key={uiState.activeStatusDataPeriod}
                          className='ct-major-twelfth x-axis-vertical-labels'
                          options={{
                            axisX: {labelInterpolationFnc: axisXLabelFormatter || formatTime},
                            axisY: {labelInterpolationFnc: axisYLabelFormatter || identity}
                          }}
                          data={health[key].reduce((result, [time, score]) => {
                            result.series[0].push({x: new Date(time), y: score});
                            return result;
                          }, {series: [[]]})}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
