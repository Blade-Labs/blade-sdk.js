import XCTest
@testable import SwiftBlade

final class SwiftBladeTests: XCTestCase {
    func testExample() throws {
        // This is an example of a functional test case.
        // Use XCTAssert and related functions to verify your tests produce the correct
        // results.
        let swiftBlade = SwiftBlade.shared
        swiftBlade.initialize("test") {
            do {
                try swiftBlade.getBalance("0.0.499326") { (result) in
                    XCTAssertNotNil(result)
                    print(result)
                }
            } catch {
                print("Exec error")
                fatalError()
            }
        }
    }
}
