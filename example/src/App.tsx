/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */
import { Agent, OutboundPackage } from '@aries-framework/core'

import { utils, HandshakeProtocol } from '@aries-framework/core'
// import { MessageReceiver } from '@aries-framework/core/build/agent/MessageReceiver'
// import { JsonEncoder } from '@aries-framework/core/build/utils'
import * as React from 'react'
import {
  StyleSheet,
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
} from 'react-native'

import {
  DEFAULT_DIDCOMM_SERVICE_UUID,
  DEFAULT_DIDCOMM_MESSAGE_CHARACTERISTIC_UUID,
  DEFAULT_DIDCOMM_INDICATE_CHARACTERISTIC_UUID,
} from '../../src/constants'

import { presentationMsg } from './presentationMsg'
import { setupAgent } from '../../packages/rest/src/utils/agent'
import { Central } from '../../src/central'
import { Peripheral } from '../../src/peripheral'

const Spacer = () => <View style={{ height: 20, width: 20 }} />

const msg = JSON.stringify(presentationMsg)

const message: OutboundPackage = {
  payload: {
    protected: 'ble',
    iv: 'ble',
    ciphertext: 'ble',
    tag: 'ble',
  },
}

const requestPermissions = async () => {
  await PermissionsAndroid.requestMultiple([
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.BLUETOOTH_CONNECT',
    'android.permission.BLUETOOTH_SCAN',
    'android.permission.BLUETOOTH_ADVERTISE',
    'android.permission.ACCESS_COARSE_LOCATION',
  ])
}

const agentA = await(
  async () =>
    await setupAgent({
      publicDidSeed: 'testtesttesttesttesttesttesttest',
      name: 'Aries Test Agent',
      port: 3001,
      endpoints: [],
    })
)()

const agentB = await(
  async () =>
    await setupAgent({
      publicDidSeed: '65748374657483920193747564738290',
      name: 'aries push notifications agent',
      port: 3001,
      endpoints: [],
    })
)()

async function makeConnection(agentA: Agent, agentB: Agent) {
  const agentAOutOfBand = await agentA.oob.createInvitation({
    handshakeProtocols: [HandshakeProtocol.Connections],
  })

  let { connectionRecord: agentBConnection } =
    await agentB.oob.receiveInvitation(agentAOutOfBand.outOfBandInvitation)

  agentBConnection = await agentB.connections.returnWhenIsConnected(
    agentBConnection!.id
  )
  let [agentAConnection] = await agentA.connections.findAllByOutOfBandId(
    agentAOutOfBand.id
  )
  agentAConnection = await agentA.connections.returnWhenIsConnected(
    agentAConnection!.id
  )

  return [agentAConnection, agentBConnection]
}

const [agentAConnection, agentBConnection] = await(
  async () => await makeConnection(agentB, agentA)
)()

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
})

export default function App() {
  const [isCentral, setIsCentral] = React.useState(false)
  const [isPeripheral, setIsPeripheral] = React.useState(false)
  const [peripheralId, setPeripheralId] = React.useState<string>()
  const [connected, setConnected] = React.useState(false)

  const central = new Central()
  const peripheral = new Peripheral()

  agentA.outboundTransports[0].start(agentA)

  agentA.outboundTransports[0].sendMessage(message)

  agentB.inboundTransports[0].start(agentB)

  React.useEffect(() => {
    const onDiscoverPeripheralListener = central.registerOnDiscoveredListener(
      ({ peripheralId: pId }: { peripheralId: string }) => {
        console.log(`Discovered: ${pId}`)
        setPeripheralId(pId)
      }
    )

    const onConnectedPeripheralListener = central.registerOnConnectedListener(
      ({ peripheralId: pId }: { peripheralId: string }) => {
        console.log(`Connected to: ${pId}`)
        setConnected(true)
      }
    )

    const onReceivedNotificationListener = central.registerMessageListener(
      console.log
    )

    agentA.events.on(
      `ConnectionStateChanged` || `BasicMessageStateChanged`,
      (event: any) => console.log(event)
    )

    const onReceivedWriteWithoutResponseListener =
      peripheral.registerMessageListener(console.log)

    agentB.events.on(
      `ConnectionStateChanged` || `BasicMessageStateChanged`,
      (event: any) => console.log(event)
    )

    return () => {
      onDiscoverPeripheralListener.remove()
      onConnectedPeripheralListener.remove()
      onReceivedNotificationListener.remove()
      onReceivedWriteWithoutResponseListener.remove()
    }
  }, [])

  return (
    <View style={styles.container}>
      <Text>Bluetooth demo screen</Text>
      <Spacer />
      {Platform.OS === 'android' && (
        <>
          <Button
            title="requestPermissions"
            onPress={async () => {
              await requestPermissions()
            }}
          />
          <Spacer />
        </>
      )}
      <Button
        title="start: central"
        onPress={async () => {
          await central.start({
            serviceUUID: DEFAULT_DIDCOMM_SERVICE_UUID,
            messagingUUID: DEFAULT_DIDCOMM_MESSAGE_CHARACTERISTIC_UUID,
            indicationUUID: DEFAULT_DIDCOMM_INDICATE_CHARACTERISTIC_UUID,
          })
          await agentA.outboundTransports[0].start(agentA)
          setIsCentral(true)
        }}
      />
      <Button
        title="start: peripheral"
        onPress={async () => {
          await peripheral.start({
            serviceUUID: DEFAULT_DIDCOMM_SERVICE_UUID,
            messagingUUID: DEFAULT_DIDCOMM_MESSAGE_CHARACTERISTIC_UUID,
            indicationUUID: DEFAULT_DIDCOMM_INDICATE_CHARACTERISTIC_UUID,
          })
          await agentB.inboundTransports[0].start(agentB)
          setIsPeripheral(true)
        }}
      />
      {isCentral && (
        <>
          <Button
            title="scan"
            onPress={async () => {
              await central.scan()
            }}
          />
          {peripheralId && (
            <Button
              title="connect"
              onPress={async () => {
                await central.connect(peripheralId)
              }}
            />
          )}
          {connected && (
            <Button
              title="write"
              onPress={async () =>
                await agentA.outboundTransports[0].sendMessage(message)
              }
            />
          )}
        </>
      )}
      {isPeripheral && (
        <>
          <Button title="advertise" onPress={() => peripheral.advertise()} />
          {/* <Button
            title="notify"
            onPress={async () => {
              const messageReceiver = agentB.injectionContainer.resolve(MessageReceiver)

              const encryptedMessage = JsonEncoder.fromString(msg)

              await messageReceiver.receiveMessage(encryptedMessage, {
                session: new BleTransportSession(utils.uuid(), peripheral),
              })
            }}
          /> */}
        </>
      )}
    </View>
  )
}
