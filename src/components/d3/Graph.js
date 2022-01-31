import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { zoomTransform } from "d3-zoom";
import { createNodes, createLinks, createNodeText, onTick } from "./graphFuncs";
import "../../styles/Graph.css";
import FriendSlide from "../FriendSlide";

export default function Graph(props) {
  const [strengths, setStrengths] = useState(() => props.friends.map((friend) => friend.strength));

  // coupled with update function in App component
  function updateConnection(index, factor) {
    setStrengths((prevStrengths) => {
      const currentStrengths = [...prevStrengths];
      const newStrength = currentStrengths[index] - factor;
      if (newStrength >= 100) {
        currentStrengths[index] = 100;
      } else if (newStrength <= 0) {
        currentStrengths[index] = 1;
      } else {
        currentStrengths[index] = newStrength;
      }
      return currentStrengths;
    });
  }

  const EDGE_GROWTH_FACTOR = 5;
  const networkGraph = useRef();

  useEffect(() => {
    const svg = d3
      .select(networkGraph.current)
      .attr("viewbox", [0, 0, props.dimensions.width, props.dimensions.height]);

    /* graph components */
    const links = createLinks(svg, props.data.links);
    const nodes = createNodes(svg, props.data.nodes, props.retrieveHandler);
    const text = createNodeText(svg, props.data.nodes, props.retrieveHandler);

    /* graph forces */
    const simulation = d3
      .forceSimulation(props.data.nodes)
      .force(
        "charge",
        d3.forceManyBody().strength((d, i) => (i === 0 ? 10 * -500 : -500))
      ) // magnetic force between nodes, positive attracts, default -30
      .force("collide", d3.forceCollide(100)) // prevent node overlap
      .force("center", d3.forceCenter(props.dimensions.width / 2, props.dimensions.height / 2).strength(1)) // force exerted from center point - evenly spreads distance between nodes

      // creates a circle that applies a pulling force to all nodes
      // .force(
      //   "enclosure",
      //   d3
      //     .forceRadial(
      //       500, // radius
      //       props.dimensions.width / 2,
      //       props.dimensions.height / 2
      //     )
      //     .strength(0.05) // maybe update this value to move nodes closer
      // )
      .force(
        "links",
        d3
          .forceLink(props.data.links)
          .id((datum) => datum.id)
          .distance((link, i) => {
            console.log(strengths[i]);
            const edgeLength = strengths[i];
            if (edgeLength <= 0) {
              return 0; // prevent node from moving past central node
            } else if (edgeLength * EDGE_GROWTH_FACTOR > 500) {
              return 500; // limit how far node can move
            }

            return edgeLength;
          })
      )
      // .alpha(0.9) // will decay until reaches default break point of 0.001
      // .alphaMin(0.01) // without this -> infinite loop
      // .alphaDecay(0.05) // rate of decay
      .tick(35); // subtract from default ticks (300 - 35 = 265 ticks)

    // default 300 ticks per simulation before simulation stops
    simulation.on("tick", onTick(links, nodes, text));

    const zoom = d3
      .zoom()
      .scaleExtent([1, 3])
      .on("zoom", () => {
        const zoomState = zoomTransform(svg.node());
        links.attr("transform", zoomState);
        nodes.attr("transform", zoomState);
        text.attr("transform", zoomState);
      });

    svg.call(zoom);
  }, [props.data.nodes, strengths]);

  return (
    <div>
      {props.selectedPerson && (
        <FriendSlide
          friend={props.selectedPerson}
          rootUserId={props.rootUserId}
          deleteHandler={props.deleteFriend}
          updateStrengthConnection={props.connectionStrengthHandler}
          connectionHandler={updateConnection}
        />
      )}
      <div className="svg-container">
        <svg className="graph" ref={networkGraph}></svg>
      </div>
    </div>
  );
}
