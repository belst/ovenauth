import { Component, JSX, useContext } from "solid-js";
import { TheaterContext } from "./store/shownav";

const Layout: Component<{children: JSX.Element}> = (props) => {
    const [theater] = useContext(TheaterContext);
    return (
        <div class="container mx-auto" classList={{
            'mt-14': !theater()
        }}>
            {props.children}
        </div>
    );
}

export default Layout;
