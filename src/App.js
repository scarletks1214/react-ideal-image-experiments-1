import React from 'react'
import IdealImage from 'react-ideal-image'

import image1 from './images/andre-spieker-238-unsplash.json'
import image2 from './images/jairo-alzate-45522-unsplash.json'
import image3 from './images/vincent-van-zalinge-408523-unsplash.json'
import image4 from './images/marvin-meyer-188676-unsplash.json'
import image5 from './images/nidhin-mundackal-281287-unsplash.json'

const Image = props => <IdealImage {...props} />

Image.defaultProps = {
  ...IdealImage.defaultProps,
  threshold: 100,
}

const src = ({name, ext, digest, width}) =>
  `./images/${name}-${width}.${digest}.${ext}`


const props = obj => ({
  width: obj.width,
  height: obj.height,
  placeholder: {lqip: obj.lqip},
  getUrl: ({width, format}) => {
    const ext = format === 'jpeg' ? 'jpg' : 'webp'
    return src({...obj, ext, width})
  },
  srcSet: obj.sizes,
  getIcon: state => {
    let loadState = state.loadState,
    overThreshold = state.overThreshold;

    if (typeof window === 'undefined' || window.navigator.userAgent === 'ReactSnap') return 'noicon';
    switch (loadState) {
      case 'loaded':
        return 'loaded';
      case 'loading':
        return overThreshold ? 'loading' : 'noicon';
      case 'initial':
        return 'loading';
      case 'error':
        return 'error'
      default:
        throw new Error('Wrong state: ' + loadState);
    }
  }
})

const App = () => (
  <React.Fragment>
    <Image alt="doggo 1" {...props(image1)} />
    <Image alt="doggo 2" {...props(image2)} />
    <Image alt="doggo 3" {...props(image3)} />
    <Image alt="doggo 4" {...props(image4)} />
    <Image alt="doggo 5" {...props(image5)} />
  </React.Fragment>
)

export default App
