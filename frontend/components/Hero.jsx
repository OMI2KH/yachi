import React, { useEffect, useRef } from "react";
import gsap from "gsap";

const Hero = ({ 
  title = "Yachi Marketplace", 
  subtitle = "Connect with top service providers worldwide", 
  bgImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
}) => {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    tl.from(titleRef.current, {
      opacity: 0,
      y: -50,
      duration: 1.2,
      ease: "power3.out",
    })
    .from(subtitleRef.current, {
      opacity: 0,
      y: 50,
      duration: 1.2,
      ease: "power3.out",
    }, "-=0.8")
    .from(bgRef.current, {
      scale: 1.1,
      opacity: 0,
      duration: 1.5,
      ease: "power2.out",
    }, "-=1.2");
  }, []);

  return (
    <section className="relative h-96 flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        ref={bgRef}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative text-center z-10 px-4">
        <h1 
          ref={titleRef} 
          className="text-5xl md:text-6xl font-bold mb-4 text-white"
        >
          {title}
        </h1>
        <p 
          ref={subtitleRef} 
          className="text-xl md:text-2xl text-gray-300"
        >
          {subtitle}
        </p>
      </div>
    </section>
  );
};

export default Hero;
