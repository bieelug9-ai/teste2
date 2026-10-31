import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

const SLICES = 16;
const CAMERA = 1.6;
const MAX_WIDTH = 55;

function arc(bend) {
  return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
}

function measure(width, height, tile, aspect, gap, bend) {
  const h = Math.min((tile / 100) * height, ((MAX_WIDTH / 100) * width) / aspect);
  const radius = width * arc(bend);
  if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0 };
  const deg = (radians) => (radians * 180) / Math.PI;
  const unit = deg(h / radius);
  const pitch = (aspect + gap / 100) * unit;
  const limit = deg(bend) + (aspect * unit) / 2;
  const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
  const round = (value) => +value.toFixed(4);
  const sweep = round((columns * pitch) / 2);
  return { columns, sweep, unit: round(unit), limit: round(Math.min(sweep, limit)) };
}

function TiltedGridHero({
  images,
  speed = 4.6,
  tileHeight = 29,
  aspectRatio = 16 / 9,
  gap = 7,
  axis = 54,
  curve = 80,
  fade = 14,
  children,
}) {
  const ref = React.useRef(null);
  const sceneRef = React.useRef(null);
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const orbit = `tgh-o-${id}`;
  const tileClass = `tgh-t-${id}`;
  const bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;
  const [layout, setLayout] = React.useState(null);
  const [shown, setShown] = React.useState({});
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = measure(width, height, tileHeight, aspectRatio, gap, bend);
      setLayout((previous) => (
        previous?.columns === next.columns
        && previous.sweep === next.sweep
        && previous.unit === next.unit
          ? previous
          : next
      ));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [tileHeight, aspectRatio, gap, bend]);

  React.useEffect(() => {
    images.forEach(({ src }) => { const image = new Image(); image.src = src; });
  }, [images]);

  const { columns, sweep, unit, limit } = layout
    ?? measure(1200, 560, tileHeight, aspectRatio, gap, bend);
  const unitLength = (amount) => `calc(${+amount.toFixed(4)} * min(${tileHeight}cqh, ${+(MAX_WIDTH / aspectRatio).toFixed(4)}cqw))`;
  const radiusValue = 100 * arc(bend);
  const radius = `${+radiusValue.toFixed(3)}cqw`;
  const turn = (degrees) => `translateZ(${radius}) rotateY(${+degrees.toFixed(4)}deg) translateZ(-${radius})`;
  const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);
  const animationCss = `@keyframes ${orbit}{from{transform:${turn(-sweep)}}to{transform:${turn(sweep)}}0%,${hide}%,${100 - hide}%,100%{visibility:hidden}${hide + 0.001}%,${100 - hide - 0.001}%{visibility:visible}}@media(prefers-reduced-motion:reduce){html:not([data-motion=\"full\"]) .${tileClass}{animation-play-state:paused}}`;
  const share = aspectRatio / SLICES;
  const duration = columns * speed;
  const mask = `linear-gradient(90deg,transparent,#000 ${fade}%,#000 ${100 - fade}%,transparent)`;

  const handlePointerMove = (event) => {
    if (!sceneRef.current || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (document.documentElement.dataset.motion !== "full") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    sceneRef.current.style.transform = `translate3d(${(x * 14).toFixed(2)}px, ${(y * 10).toFixed(2)}px, 0)`;
  };

  const handlePointerLeave = () => {
    if (sceneRef.current) sceneRef.current.style.transform = "translate3d(0, 0, 0)";
  };

  return (
    <div
      ref={ref}
      className="tilted-grid-shell"
      style={{ containerType: "size" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <style>{animationCss}</style>
      <div
        ref={sceneRef}
        aria-hidden="true"
        className="tgh-scene"
        style={{
          opacity: layout ? 1 : 0,
          perspective: `${+(radiusValue * CAMERA).toFixed(3)}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        {Array.from({ length: columns }, (_, tileIndex) => {
          const first = columns - 1 - tileIndex;
          const image = images[(shown[tileIndex] ?? first) % Math.max(images.length, 1)];
          return (
            <div
              key={tileIndex}
              className={`tgh-tile ${tileClass}`}
              style={{
                left: `calc(50% - ${unitLength(aspectRatio / 2)})`,
                top: `calc(${axis}% - ${unitLength(0.5)})`,
                width: unitLength(aspectRatio),
                height: unitLength(1),
                animation: `${orbit} ${duration}s linear ${-tileIndex * speed}s infinite`,
                animationPlayState: paused ? "paused" : "running",
              }}
              onAnimationIteration={(event) => {
                const lap = Math.round(event.elapsedTime / duration);
                setShown((previous) => {
                  const next = lap * columns + first;
                  return previous[tileIndex] === next
                    ? previous
                    : { ...previous, [tileIndex]: next };
                });
              }}
            >
              {Array.from({ length: SLICES }, (_, sliceIndex) => (
                <div
                  key={sliceIndex}
                  className="tgh-slice"
                  style={{
                    left: unitLength((aspectRatio - share) / 2),
                    width: sliceIndex === SLICES - 1 ? unitLength(share) : `calc(${unitLength(share)} + 1px)`,
                    height: unitLength(1),
                    transform: turn((aspectRatio / 2 - (sliceIndex + 0.5) * share) * unit),
                  }}
                >
                  {image ? (
                    <img
                      src={image.src}
                      alt=""
                      draggable="false"
                      className="tgh-image"
                      style={{
                        left: unitLength(-sliceIndex * share),
                        width: unitLength(aspectRatio),
                        height: unitLength(1),
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="tgh-vignette" aria-hidden="true" />
      <div className="tgh-interface">
        <span aria-hidden="true"><i /> SIGNAL STREAM / LIVE</span>
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Ativar fluxo" : "Pausar fluxo"}
        </button>
      </div>
      {children}
    </div>
  );
}

const IMAGE_ROOT = "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev";
const IMAGES = [
  `${IMAGE_ROOT}/stock-images/767d99bb371a54d0d36751e8cecae43c.jpg`,
  `${IMAGE_ROOT}/gradients/hero_gradient/hero-gradients-01.png`,
  `${IMAGE_ROOT}/stock-images/821d815affa6496c39cbdeeec7a84603.jpg`,
  `${IMAGE_ROOT}/gradients/moon/moon-grade-03.png`,
  `${IMAGE_ROOT}/stock-images/937438c560ada1c83317f2c11b3454b0.jpg`,
  `${IMAGE_ROOT}/gradients/shade_shiters/shade-shifters-05.png`,
  `${IMAGE_ROOT}/stock-images/98f89cb9994f5c382ab964062c4039db.jpg`,
  `${IMAGE_ROOT}/gradients/shade_shiters/shade-shifters-09.png`,
].map((src) => ({ src }));

const mount = document.querySelector("#tilted-grid-root");
if (mount) {
  const root = createRoot(mount);
  flushSync(() => {
    root.render(
      <TiltedGridHero images={IMAGES} tileHeight={32} axis={54} curve={80}>
        <div className="hero-copy tgh-hero-copy">
          <p className="eyebrow hero-enter" style={{ "--delay": "80ms" }}>
            <span className="pulse-dot" />
            Sistemas adaptativos para operações reais
          </p>
          <h1 id="hero-title" className="hero-enter" data-text-reveal style={{ "--delay": "130ms" }}>
            Sua operação,<br />em estado de <em>fluxo.</em>
          </h1>
          <p className="hero-intro hero-enter" style={{ "--delay": "190ms" }}>
            A Lumera conecta dados, decisões e equipes em uma camada operacional inteligente — para que o trabalho avance sem depender de mais uma tela.
          </p>
          <div className="hero-actions hero-enter" style={{ "--delay": "240ms" }}>
            <a className="button button-primary" data-magnetic href="#plataforma">
              Explorar a plataforma
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9h10M10 5l4 4-4 4" /></svg>
            </a>
            <a className="text-link" href="#arquitetura">Ver como funciona <span aria-hidden="true">↘</span></a>
          </div>
        </div>
      </TiltedGridHero>,
    );
  });
  document.documentElement.classList.add("has-tilted-grid");
}

