import { reactWidget } from 'reactR';
import SpaceTimeViewer from './SpaceTimeViewer';

// function Spacetimeview({ data }) {
//   return (
//     <div>
//       <h1> My widget </h1>
//       <p> { data } </p>
//     </div>
//   )
// }

reactWidget(
  'spacetimeview', 
  'output', 
  {
    SpaceTimeViewer
  },
  {}
);
