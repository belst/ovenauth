import { Component, JSX } from "solid-js";

const Layout: Component<{children: JSX.Element}> = (props) => {
    return (
        <div class="container mx-auto">
            {props.children}
        </div>
    );
}

export default Layout;
