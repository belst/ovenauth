import { useSearchParams } from "@solidjs/router";
import { createContext } from "solid-js";

type TheaterContextType = [
    () => boolean,
    object
];

export const TheaterContext = createContext<TheaterContextType>([() => false, {}]);

export function TheaterProvider(props) {
    const [searchParams, setSearchParams] = useSearchParams();

    const theater = [
        () => searchParams.hideNav && searchParams.hideNav !== '',
        {
            toggleTheaterMode() {
                setSearchParams({hideNav: searchParams.hideNav && searchParams.hideNav === '' ? '1' : ''})
            }
        }
    ] satisfies TheaterContextType;

    return (
        <TheaterContext.Provider value={theater}>
            {props.children}
        </TheaterContext.Provider>
    );
}
