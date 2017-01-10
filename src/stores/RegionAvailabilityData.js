import {observable, action} from 'mobx';
import {without} from 'lodash';

export default class RegionAvailbilityData {
  dataByRegion = observable.map()

  @action
  initializeRegionData(regionName, period, serviceName = 'aggregated') {
    if (!this.dataByRegion.get(regionName)) {
      this.dataByRegion.set(regionName, observable.map());
    }
    if (!this.dataByRegion.get(regionName).get(period)) {
      this.dataByRegion.get(regionName).set(period, observable.map());
    }
    if (!this.dataByRegion.get(regionName).get(period).get(serviceName)) {
      this.dataByRegion.get(regionName).get(period).set(serviceName, observable({
        data: [],
        score: null
      }));
    }
    return this.dataByRegion.get(regionName).get(period).get(serviceName);
  }

  @action
  update(regionName, period, serviceName = 'aggregated', plainAvailbilityData) {
    const {availability: score, availability_data: data} = plainAvailbilityData;
    Object.assign(this.initializeRegionData(regionName, period, serviceName), {
      data,
      score
    });
  }

  getRegionServices(regionName, period) {
    try {
      return without(this.dataByRegion.get(regionName).get(period).keys(), 'aggregated');
    } catch (e) {
      return [];
    }
  }

  get(regionName, period, serviceName = 'aggregated') {
    try {
      return this.dataByRegion.get(regionName).get(period).get(serviceName);
    } catch (e) {
      return null;
    }
  }
}
