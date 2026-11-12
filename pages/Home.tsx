import React from 'react';
import Nav from '../components/landing/Nav';
import Hero from '../components/landing/Hero';
import Tools from '../components/landing/Tools';
import Process from '../components/landing/Process';
import Showcase from '../components/landing/Showcase';
import Pricing from '../components/landing/Pricing';
import Faq from '../components/landing/Faq';
import Footer from '../components/landing/Footer';

/*
 * Landing pública. Vive fuera del tema claro/oscuro de la app:
 * usa siempre la paleta cálida definida en index.html.
 */
const Home: React.FC = () => (
  <div className="min-h-screen bg-shell p-0 sm:p-3">
    <Nav />
    <div className="mx-auto max-w-[1600px] rounded-b-6xl bg-bone pb-2 sm:rounded-6xl">
      <Hero />
      <Tools />
      <Process />
      <Showcase />
      <Pricing />
      <Faq />
      <Footer />
    </div>
  </div>
);

export default Home;
