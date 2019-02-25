import React from 'react'
import IdealImage from 'react-ideal-image'

import image1 from './images/andre-spieker-238-unsplash.json'
import image2 from './images/jairo-alzate-45522-unsplash.json'
import image3 from './images/vincent-van-zalinge-408523-unsplash.json'
import image4 from './images/marvin-meyer-188676-unsplash.json'
import image5 from './images/nidhin-mundackal-281287-unsplash.json'

import { ReactComponent as IconComponent } from './icons/outline-autorenew-24px.svg';

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
  icons: {
    loading: (props) => <IconComponent width={props.iconSize} height={props.iconSize} {...props} />,
    load: (props) => <IconComponent width={props.iconSize} height={props.iconSize} {...props} />,
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
  iconColor: "#123456",
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
