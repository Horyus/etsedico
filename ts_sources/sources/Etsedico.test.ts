declare var describe;
declare var test;
declare var expect;

import { Etsedico } from "./Etsedico";

describe("Dummy Test Suite", () => {

    test("Testing Etsedico", () => {
        const instance = new Etsedico("test");
        expect(instance.getValue()).toBe("test");
    });

});
