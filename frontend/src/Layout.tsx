import { Component, JSX, useContext } from "solid-js";
import { TheaterContext } from "./store/shownav";

const Layout: Component<{children: JSX.Element}> = (props) => {
    const [theater] = useContext(TheaterContext);
    return (
        <div class="container mx-auto mt-" classList={{
            'mt-12': !theater()
        }}>
            {props.children}
        </div>
    );
}

export default Layout;
