import { useSearchParams } from "@solidjs/router";
import { JSX, createContext } from "solid-js";

type TheaterContextType = [
    () => boolean,
    {
        toggleTheaterMode: () => void
    }
];

export const TheaterContext = createContext<TheaterContextType>([() => false, { toggleTheaterMode: () => { } }]);

export function TheaterProvider(props: { children: number | boolean | Node | JSX.ArrayElement | (string & {}); }) {
    const [searchParams, setSearchParams] = useSearchParams();

    const theater = [
        () => searchParams.hideNav && searchParams.hideNav !== '',
        {
            toggleTheaterMode() {
                setSearchParams({ hideNav: searchParams.hideNav === undefined || (searchParams.hideNav && searchParams.hideNav === '') ? '1' : '' });
            }
        }
    ] satisfies TheaterContextType;

    return (
        <TheaterContext.Provider value={theater}>
            {props.children}
        </TheaterContext.Provider>
    );
}
