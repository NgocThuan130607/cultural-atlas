// Time travel page: drag a slider through the landmark's eras (?id=…&era=N opens a given era).
import { runLandmarkPage } from '../landmark/shell.js';
import { initTimeline } from '../landmark/timeline.js';

runLandmarkPage('time', initTimeline);
