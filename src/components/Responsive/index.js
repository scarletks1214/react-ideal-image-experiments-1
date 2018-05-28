import React, {Component} from 'react'
import PropTypes from 'prop-types'
import Waypoint from 'react-waypoint'
import Media from '../Media'
import {icons, loadStates} from '../constants'
import {xhrLoader, image, timeout, combineCancel} from '../loaders'
import supportsWebp from '../webp'

const {initial, loading, loaded, error} = loadStates

const ssr =
  typeof window === 'undefined' || window.navigator.userAgent === 'ReactSnap'

const nativeConnection =
  typeof window !== 'undefined' && !!window.navigator.connection

const getScreenWidth = () => {
  if (typeof window === 'undefined') return 0
  const devicePixelRatio = window.devicePixelRatio || 1
  const {screen} = window
  const {width} = screen
  // const angle = (screen.orientation && screen.orientation.angle) || 0
  // return Math.max(width, height)
  // const rotated = Math.floor(angle / 90) % 2 !== 0
  // return (rotated ? height : width) * devicePixelRatio
  return width * devicePixelRatio
}

const screenWidth = getScreenWidth()

const guessMaxImageWidth = dimensions => {
  if (typeof window === 'undefined') return 0
  const imgWidth = dimensions.width

  const {screen} = window
  const sWidth = screen.width
  const sHeight = screen.height

  const {documentElement} = document
  const windowWidth = window.innerWidth || documentElement.clientWidth
  const windowHeight = window.innerHeight || documentElement.clientHeight

  const windowResized = sWidth > windowWidth

  let result
  if (windowResized) {
    const body = document.getElementsByTagName('body')[0]
    const scrollWidth = windowWidth - imgWidth
    const isScroll =
      body.clientHeight > windowHeight || body.clientHeight > sHeight
    if (isScroll && scrollWidth <= 15) {
      result = sWidth - scrollWidth
    } else {
      // result = imgWidth / (windowWidth - scrollWidth) * (sWidth - scrollWidth)
      result = imgWidth / windowWidth * sWidth
    }
  } else {
    result = imgWidth
  }
  const devicePixelRatio = window.devicePixelRatio || 1
  return result * devicePixelRatio
}

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return 'n/a'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
  if (i === 0) return `${bytes} ${sizes[i]}`
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`
}

export default class Responsive extends Component {
  constructor(props) {
    super(props)
    const controledOnLine = props.onLine !== undefined
    const pickedSrc = this.getSrc({srcset: this.props.srcset, screenWidth})
    if (!pickedSrc.src && !this.props.getUrl) {
      throw new Error('src required')
    }
    this.state = {
      loadState: initial,
      connection: nativeConnection
        ? {
            downlink: navigator.connection.downlink, // megabits per second
            rtt: navigator.connection.rtt, // ms
            effectiveType: navigator.connection.effectiveType, // 'slow-2g', '2g', '3g', or '4g'
          }
        : null,
      onLine: controledOnLine ? props.onLine : true,
      controledOnLine,
      overThreshold: false,
      inViewport: false,
      userTriggered: false,
      possiblySlowNetwork: false,
      pickedSrc,
    }
  }

  static propTypes = {
    /** how much to wait in ms until concider download to slow */
    threshold: PropTypes.number,
    /** function which decides if image should be downloaded */
    shouldAutoDownload: PropTypes.func,
    /** function to generate src based on width and format */
    getUrl: PropTypes.func,
    /** array of sources */
    srcset: PropTypes.arrayOf(
      PropTypes.shape({
        src: PropTypes.string,
        width: PropTypes.number.isRequired,
        size: PropTypes.number,
        format: PropTypes.oneOf(['jpeg', 'webp']).isRequired,
      }),
    ).isRequired,
    /** If you will not pass this value, component will detect onLine status based on browser API, otherwise will use passed value */
    onLine: PropTypes.bool,
  }

  static defaultProps = {
    /**
     * @returns {boolean} - is connection good enough to auto load the image
     */
    shouldAutoDownload: ({
      connection,
      size,
      threshold,
      possiblySlowNetwork,
    }) => {
      if (possiblySlowNetwork) return false
      const {downlink, rtt, effectiveType} = connection || {}
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          return false
        case '3g':
          if (downlink && size && threshold) {
            return size * 8 / (downlink * 1000) + rtt < threshold
          }
          return false
        case '4g':
        default:
          return true
      }
    },
  }

  getSrc({srcset, screenWidth}) {
    if (srcset.length === 0) throw new Error('Need at least one item in srcset')
    let supportedFormat
    if (supportsWebp) {
      supportedFormat = srcset.filter(x => x.format === 'webp')
      if (supportedFormat.length === 0) supportedFormat = srcset
    } else {
      supportedFormat = srcset.filter(x => x.format !== 'webp')
      if (supportedFormat.length === 0)
        throw new Error('Need at least one item in srcset')
    }
    let widths = supportedFormat.filter(x => x.width >= screenWidth)
    if (widths.length === 0) widths = supportedFormat
    const width = Math.min.apply(null, widths.map(x => x.width))
    return supportedFormat.filter(x => x.width === width)[0]
  }

  componentDidMount() {
    if (nativeConnection) {
      this.updateConnection = () => {
        if (!navigator.onLine) return
        if (this.state.loadState === initial) {
          this.setState({
            connection: {
              effectiveType: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              rtt: navigator.connection.rtt,
            },
          })
        }
      }
      navigator.connection.addEventListener('onchange', this.updateConnection)
    } else if (this.props.threshold) {
      this.possiblySlowNetworkListener = e => {
        if (this.state.loadState !== initial) return
        const {possiblySlowNetwork} = e.detail
        if (!this.state.possiblySlowNetwork && possiblySlowNetwork) {
          this.setState({possiblySlowNetwork})
        }
      }
      window.document.addEventListener(
        'possiblySlowNetwork',
        this.possiblySlowNetworkListener,
      )
    }
    if (!this.state.controledOnLine) {
      this.updateOnlineStatus = () => this.setState({onLine: navigator.onLine})
      this.updateOnlineStatus()
      window.addEventListener('online', this.updateOnlineStatus)
      window.addEventListener('offline', this.updateOnlineStatus)
    }
  }

  componentWillUnmount() {
    this.clear()
    if (nativeConnection) {
      navigator.connection.removeEventListener(
        'onchange',
        this.updateConnection,
      )
    } else if (this.props.threshold) {
      window.document.removeEventListener(
        'possiblySlowNetwork',
        this.possiblySlowNetworkListener,
      )
    }
    if (!this.state.controledOnLine) {
      window.removeEventListener('online', this.updateOnlineStatus)
      window.removeEventListener('offline', this.updateOnlineStatus)
    }
  }

  // TODO: fix this
  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.state.controledOnLine) {
      if (nextProps.onLine === undefined) {
        throw new Error('You should pass onLine value to controlled component')
      } else {
        this.setState({onLine: nextProps.onLine})
      }
    }
    // TODO: check if this works
    if (nextProps.srcset !== this.props.srcset) this.cancel(false)
  }

  onClick = () => {
    const {loadState, onLine, overThreshold} = this.state
    if (!onLine) return
    switch (loadState) {
      case loading:
        if (overThreshold) this.cancel(true)
        return
      case loaded:
        // nothing
        return
      case initial:
      case error:
        this.load(true)
        return
      default:
        throw new Error(`Wrong state: ${loadState}`)
    }
  }

  clear() {
    if (this.loader) {
      this.loader.cancel()
      this.loader = undefined
    }
  }

  cancel(userTriggered) {
    if (loading !== this.state.loadState) return
    this.clear()
    this.loadStateChange(initial, userTriggered)
  }

  loadStateChange(loadState, userTriggered, loadInfo = null) {
    this.setState({
      loadState,
      overThreshold: false,
      userTriggered: !!userTriggered,
      loadInfo,
    })
  }

  getUrl() {
    const {getUrl} = this.props
    const {pickedSrc} = this.state
    if (getUrl) {
      return getUrl(pickedSrc)
    } else {
      return pickedSrc.src
    }
  }

  load = userTriggered => {
    const {loadState} = this.state
    if (ssr || loaded === loadState || loading === loadState) return
    this.loadStateChange(loading, userTriggered)

    const {threshold} = this.props
    const url = this.getUrl()
    const imageLoader = xhrLoader(url)
    imageLoader
      .then(() => {
        this.clear()
        this.loadStateChange(loaded, false)
      })
      .catch(e => {
        this.clear()
        if (e.status === 404) {
          this.loadStateChange(error, false, 404)
        } else {
          this.loadStateChange(error, false)
        }
      })

    if (threshold) {
      const timeoutLoader = timeout(threshold)
      timeoutLoader.then(() => {
        if (!this.loader) return
        window.document.dispatchEvent(
          new CustomEvent('possiblySlowNetwork', {
            detail: {possiblySlowNetwork: true},
          }),
        )
        this.setState({overThreshold: true})
        if (!this.state.userTriggered) this.cancel(true)
      })
      this.loader = combineCancel(imageLoader, timeoutLoader)
    } else {
      this.loader = imageLoader
    }
  }

  shouldAutoDownload() {
    const shouldAutoDownload = this.props.shouldAutoDownload
    const {pickedSrc} = this.state
    return shouldAutoDownload({...this.state, size: pickedSrc.size})
  }

  iconToMessage(icon, state) {
    switch (icon) {
      case icons.noicon:
      case icons.loaded:
        return {icon}
      case icons.loading:
        return {icon, message: 'Loading...'}
      case icons.load:
        const {pickedSrc} = state
        const {size} = pickedSrc
        if (size) {
          return {
            icon,
            message: [
              'Click to load (',
              <nobr key="nb">{bytesToSize(size)}</nobr>,
              ')',
            ],
          }
        } else {
          return {icon, message: 'Click to load'}
        }
      case icons.offline:
        return {icon, message: 'Your browser is offline. Image not loaded'}
      case icons.error:
        const {loadInfo} = state
        if (loadInfo === 404) {
          return {icon, message: '404. Image not found'}
        } else {
          return {icon, message: 'Error. Click to reload'}
        }
      default:
        throw new Error(`Wrong icon: ${icon}`)
    }
  }

  stateToIcon(state) {
    const i = this.iconToMessage
    const {loadState, onLine, overThreshold, userTriggered} = state
    // this breaks contract?
    const shouldAutoDownload = this.shouldAutoDownload()
    if (ssr) return i(icons.noicon)
    switch (loadState) {
      case loaded:
        return i(icons.loaded)
      case loading:
        return overThreshold ? i(icons.loading) : i(icons.noicon)
      case initial:
        if (onLine) {
          return userTriggered || !shouldAutoDownload
            ? i(icons.load, state)
            : i(icons.noicon)
        } else {
          return i(icons.offline)
        }
      case error:
        return onLine ? i(icons.error, state) : i(icons.offline)
      default:
        throw new Error(`Wrong state: ${loadState}`)
    }
  }

  onEnter = () => {
    if (this.state.inViewport) return
    this.setState({inViewport: true})
    if (this.props.srcset.length > 1) {
      const pickedSrc = this.getSrc({
        srcset: this.props.srcset,
        screenWidth: guessMaxImageWidth(this.state.dimensions),
      })
      // what side effects here?
      this.setState({pickedSrc})
    }
    if (this.shouldAutoDownload()) this.load(false)
  }

  onLeave = () => {
    if (this.state.loadState === loading && !this.state.userTriggered) {
      this.setState({inViewport: false})
      this.cancel(false)
    }
  }

  render() {
    const {icon, message} = this.stateToIcon(this.state)
    return (
      <Waypoint onEnter={this.onEnter} onLeave={this.onLeave}>
        <Media
          {...this.props}
          onClick={this.onClick}
          icon={icon}
          src={this.getUrl()}
          onDimensions={dimensions => this.setState({dimensions})}
          message={message}
        />
      </Waypoint>
    )
  }
}