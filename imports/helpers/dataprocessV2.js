// NPM
import lodash from 'lodash';
import moment from 'moment';
import d3 from 'd3';

export const DataProcessHelper = {
    /**
    * @summary Comparing change in the last two data points
    * @param {object} data - The data to process
    * @param {string} timeScale - The duration of time to join the data
    * @param {string} xKey - The x value of the data point, typically will be date
    * @param {string} yKey - The y value of the data point e.g. createdTotal, commitsTotal etc.
    * @returns {object} - An object of the last, now and diff between the two data points
    */
    getDataComparison(data, timeScale, xKey, yKey) {
        let nowData;
        let diff;
        let lastData;

        if (timeScale === "day") {
            nowData = lodash.chain(data).filter((x) => {
                return moment().format("YYYY-MM-DD") === moment(x[xKey]).format("YYYY-MM-DD");
            }).first().value();

            lastData = lodash.chain(data).filter((x) => {
                return moment().subtract(1, 'days').format("YYYY-MM-DD") === moment(x[xKey]).format("YYYY-MM-DD");
            }).first().value();
        } else if (timeScale === "week") {
            nowData = lodash.chain(data).filter((x) => {
                return moment().format("YYYY-w") === moment(x[xKey]).format("YYYY-w");
            }).first().value();

            lastData = lodash.chain(data).filter((x) => {
                return moment().subtract(1, 'weeks').format("YYYY-w") === moment(x[xKey]).format("YYYY-w");
            }).first().value();
        } else if (timeScale === "month") {
            nowData = lodash.chain(data).filter((x) => {
                return moment().format("YYYY-MMMM") === moment(x[xKey]).format("YYYY-MMMM");
            }).first().value();

            lastData = lodash.chain(data).filter((x) => {
                return moment().subtract(1, 'months').format("YYYY-MMMM") === moment(x[xKey]).format("YYYY-MMMM");
            }).first().value();
        } else if (timeScale === "year") {
            nowData = lodash.chain(data).filter((x) => {
                return moment().format("YYYY") === moment(x[xKey]).format("YYYY");
            }).first().value();

            lastData = lodash.chain(data).filter((x) => {
                return moment().subtract(1, 'years').format("YYYY") === moment(x[xKey]).format("YYYY");
            }).first().value();
        }

        const now = nowData && nowData[yKey] ? nowData[yKey] : 0;
        const last = lastData && lastData[yKey] ? lastData[yKey] : 0;

        // Compare data calculation
        const total = last + now;

        if (total !== 0) {
            diff = (((now - last) / total) * 100);
        } else {
            diff = 0;
        }

        return { last, now, diff };
    },
}
