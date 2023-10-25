import { scaleOrdinal } from 'd3-scale';
import { schemeSet3 } from 'd3-scale-chromatic';

const color = scaleOrdinal(schemeSet3);

export default color;
