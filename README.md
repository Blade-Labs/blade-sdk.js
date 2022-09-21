# Swift Blade SDK

## Requirements

- Swift v5.3+
- iOS 10+ (2016)

## Install

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/Blade-Labs/swift-blade.git", from: "0.1.0")
]
```

See ["Adding Package Dependencies to Your App"](https://developer.apple.com/documentation/swift_packages/adding_package_dependencies_to_your_app) for help on adding a swift package to your project.

## Usage

```swift
import SwiftBlade

SwiftBlade.shared.initialize(apiKey: "API_KEY", network: .TESTNET) {
  // ready to use SwiftBlade
  print("init complete")
}

// Get balance by hedera id
SwiftBlade.shared.getBalance(addressTextField.text!) { (result, error) in
  print(result)
}

```
