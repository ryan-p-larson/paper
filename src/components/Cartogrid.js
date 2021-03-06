/* Dependencies */
import React from 'react';
import { scaleBand } from '@vx/scale';
import { Text } from '@vx/text';
import * as d3 from 'd3';

/* Components */
import Gridtile from './tiles/Gridtile';
import CommunityTile from './tiles/CommunityTile';
import CountTile from './tiles/Counttile';
import SentTile from './tiles/Senttile';
import GlobalTile from './tiles/GlobalTile';


/* Util */
const get_scales = (width, height, padding) => {
  /* Sets scales for us. */
  let x_scale = scaleBand({
    domain : [...Array(11).keys()],
    range  : [0, width],
    padding: padding
  });

  let y_scale = scaleBand({
    domain : [...Array(8).keys()],
    range  : [0, height],
    padding: padding
  });

  return { x_scale, y_scale };
}

export default class Cartogrid extends React.Component {
  constructor(props) {
    super();

    // Create the chart scales
    let { width, height, padding } = props;
    let aspect_ratio = Math.min(width, height);
    width = aspect_ratio;
    height = aspect_ratio;
    
    let {x_scale, y_scale} = get_scales(width, height, padding);

    this.state = {
      width             : width,
      height            : height,
      padding           : padding,
      x_scale           : x_scale,
      y_scale           : y_scale,
      tile_scale        : undefined,
      data              : {},
      tweets            : {},
      chart             : props.chart,
      view              : props.view,
      tile              : props.tile,
      community         : props.community,
      selected_state    : props.selected_state
    };

    // Functions to create state plots
    this.create_tile  = this.create_tile.bind(this);
    this.create_chart = this.create_chart.bind(this);
    this.create_tile_scale = this.create_tile_scale.bind(this);
    this.render_title      = this.render_title.bind(this);
    this.render_global_tile = this.render_global_tile.bind(this);
  }

  componentWillMount() { 
    // Load data, and set our scales
    var data = require('../data/visualization.json');

    var tweets = (require('../data/tweets.json'))['tweets'].slice(100, 200);
    tweets = tweets.sort((a, b) => +a.polarity - +b.polarity);

    // Compute scales
    let tile_scale = this.create_tile_scale(data, this.state.tile);

    this.setState({ data, tweets, tile_scale });
  }

  componentWillReceiveProps(nextProps) {
    // Scale dimensions
    let width   = nextProps.width * 0.925; //* 0.65 
    //let height  = nextProps.height
    let height = width / 1.325;
    let padding = nextProps.padding

    // Create new scales
    let {x_scale, y_scale} = get_scales(width, height, padding);
    let tile_scale = this.create_tile_scale(this.state.data, nextProps.tile);

    this.setState({ 
      ...nextProps, 
      x_scale, 
      y_scale,
      tile_scale,
      width,
      height
    });
  }

  create_tile_scale(data, tile_attr) {
    /* Creates a scale sizing the tile based on our data view. */

    // Map the state's tile attr from the info
    let state_attrs = d3.values(data).map(d => d.info[tile_attr]);
    let domain = d3.extent(state_attrs);

    // Create two scales for data views
    let tweet_scale = d3.scaleLog()
      .base(2)
      .domain(domain)
      .range([0.5, 1.0]);

    let population_scale = d3.scaleQuantile()
      .domain(domain)
      .range([0.5, 0.675, 0.85, 1.0]);

    return (tile_attr === 'total_tweets') ? tweet_scale : population_scale;
  }

  create_tile(state, i) {
    // Size the tile first
    let scale = this.state.tile_scale(state.info[this.state.tile]);
    
    // Shift to center the tiles due to scaling
    let tile_width_offset = (this.state.x_scale.bandwidth() - (scale * this.state.x_scale.bandwidth())) / 2;
    let tile_height_offset = (this.state.y_scale.bandwidth() - (scale * this.state.y_scale.bandwidth())) / 2;

    let top = this.state.y_scale(state.info.y) + tile_height_offset;
    let left = this.state.x_scale(state.info.x) + tile_width_offset;
    
    // Resize the tile dimensions
    let tile_width = this.state.x_scale.bandwidth() * scale;
    let tile_height = this.state.y_scale.bandwidth() * scale;

    // Font styles
    let selected = state.info.abbrv === this.state.selected_state;

    return (
      <Gridtile
        key={i}
        abbrv={state.info.abbrv}
        top={top}
        left={left}
        width={tile_width}
        height={tile_height}
        selected_state={this.state.selected_state}
        view={this.state.view}
        escape={this.props.escape}
      >
        {this.create_chart(tile_width, tile_height, state)}
      </Gridtile>
    );
  }

  create_chart = (width, height, data) => {
    /* Creates a chart on our state tile, depends on current chart selected. */
    let weekly_max = d3.max(data.counts, d => d.count);

    switch(this.state.chart) {
      case 'topics':
        return(<CommunityTile
          width={width}
          height={height}
          data={data.communities}
          weekly_max={weekly_max}
          view={this.state.view}
          community={this.state.community}
          info={data.info}
          tweets={this.state.tweets}
          />);
      case 'counts':
        return(<CountTile
          width={width}
          height={height}
          data={data.counts}
          weekly_max={weekly_max}
          view={this.state.view}
        />);
      case 'sents':
        return (<SentTile
          width={width}
          height={height}
          data={data.sentiments}
          view={this.state.view}
        />);
      default:
          return null;
    }
  }

  render_title() {
    /* Renders a title based on our view */
    switch (this.state.chart) {
      case 'topics':
        return 'Tweet Topics of Public Immigration Discourse before and after the Travel Ban';
      case 'sents':
        return 'Extreme Tweet Sentiments of Public Immigration Discourse before and after the Travel Ban';
      case 'counts':
        return 'Weekly Tweet Counts of Public Immigation Discourse before and after the Travel Ban';
      default:
        return 'CarSenToGram';
    };
  }

  render_global_tile() {
    return (
      <Gridtile
        left={this.state.x_scale(2)}
        top={120}
        width={this.state.x_scale.bandwidth()}
        height={this.state.y_scale.bandwidth()}
        abbrv={'U.S.'}
        global={true}
      >
        <GlobalTile
          width={this.state.x_scale.bandwidth()}
          height={this.state.y_scale.bandwidth()}
          data={this.state.data}
          chart={this.state.chart}
          view={this.state.view}
        />
      </Gridtile>    
    );
  }

  render() {
    // How are we looking?
    //console.log('-------\nCartogrid --------------------------------------------');
    //console.log(this.state, this.props);


    return (
      <svg 
        className={'cartogrid'}
        width={this.state.width}
        height={this.state.height}
      >
        {this.state.data && 
          d3.values(this.state.data).map((d, i) => this.create_tile(d, i))}
        {this.state.data && this.render_global_tile()}
        <Text
          x={this.state.x_scale(1)}
          y={35}
          fontSize={24}
          fontWeight={700}
          verticalAnchor={'start'}
        >{this.render_title()}
        </Text>
      </svg>
    );
  } 
};