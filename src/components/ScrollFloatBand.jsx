import ScrollFloat from './ScrollFloat';
import './ScrollFloatBand.css';

export default function ScrollFloatBand() {
  return (
    <section className="scroll-float-band" aria-label="React Bits">
      <p className="scroll-float-band__hint">SCROLL TO REVEAL</p>
      <ScrollFloat
        effect="float"
        splitBy="chars"
        direction="up"
        order="start"
        fromColor="currentColor"
        animationDuration={1}
        ease="back.inOut(2)"
        scrollStart="center bottom+=50%"
        scrollEnd="bottom bottom-=40%"
        stagger={0.03}
        distance={120}
        stretch={2.3}
        smoothing={0}
        containerClassName="scroll-float-band__title"
      >
        React Bits
      </ScrollFloat>
    </section>
  );
}
