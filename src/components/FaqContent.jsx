export default function FaqContent() {
  return (
    <>
      <h3>What does &ldquo;Available Capacity&rdquo; mean?</h3>
      <p>
        The available headroom remaining for the selected Capacity Mode, graded High / Medium /
        Low / Contact for info.
      </p>

      <h3>What does &ldquo;Capacity Mode&rdquo; mean?</h3>
      <p>
        Colour-codes the map by Demand capacity (for demand connections), Generation capacity
        (for generation connections), or Fault Level capacity.
      </p>

      <h3>How are pin colours calculated?</h3>
      <p>
        Each pin uses the network operator's own Red/Amber/Green grading for the selected
        Capacity Mode, taking the worse of the Primary and Bulk Supply Point axes where a site has
        both. Blue means data is unavailable for that axis.
      </p>

      <h3>What do the letters on the map pins mean?</h3>
      <p>
        <strong>P</strong> = Primary substation (33kV/11kV or 33kV/6.6kV). <strong>B</strong> =
        Bulk Supply Point (110kV/33kV). <strong>PP</strong> = Dual Primary Substation (both
        33kV/11kV and 33kV/6.6kV at one site). <strong>BP</strong> = Combined Bulk Supply Point
        and Primary substation at one site. For PP and BP pins, the two halves are coloured
        independently — see the Key for details.
      </p>
    </>
  );
}
