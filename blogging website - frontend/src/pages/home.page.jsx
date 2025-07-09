import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";

const Homepage = () => {
  return (
    <AnimationWrapper>
      <section className="h-cover flex justify-center gap-10 ">
        {/* Latest Blogs */}
        <div className="w-full">
          <InPageNavigation
            routes={["home", "trending blogs"]}
            defaultHidden={["trending blogs"]}
          ></InPageNavigation>
        </div>
        {/* filters and trending blogs */}
      </section>
    </AnimationWrapper>
  );
};

export default Homepage;
