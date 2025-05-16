import { reactWidget } from 'reactR';
import SpaceTimeViewer from './SpaceTimeViewer';
import SpaceTimeTabs from './SpaceTimeTabs';


reactWidget(
    'spacetimeview',
    'output',
    {
      SpaceTimeViewer,
      SpaceTimeTabs
    },
    {}
);

