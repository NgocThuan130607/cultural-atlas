// Time travel page: the landmark's eras, one slide each (?id=…&part=era-N opens a given era).
import { runLandmarkPage } from '../landmark/shell.js';
import { initTimeline } from '../landmark/timeline.js';

runLandmarkPage('time', initTimeline);
