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

const customIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill='#123456' width="92" height="92" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0V0z"/><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>);

const props = obj => ({
  width: obj.width,
  height: obj.height,
  placeholder: {lqip: obj.lqip},
  getUrl: ({width, format}) => {
    const ext = format === 'jpeg' ? 'jpg' : 'webp'
    return src({...obj, ext, width})
  },
  srcSet: obj.sizes,
  icons: {
    loading: (props) => customIcon,
    load: (props) => customIcon,
  },
  getMessage: (icon, state) => {
    switch (icon) {
      case 'load':
        return 'download now';
      case 'loaded':
        return 'loaded successfuly';
      case 'loading':
        return 'loading...';
      case 'noicon':
        return '';
      case 'error':
        return 'error'
      default:
        return '';
    }
  },
  iconSize: 92
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
