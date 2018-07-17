/*
Copyright 2016 IBM
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
Licensed Materials - Property of IBM
© Copyright IBM Corp. 2016
*/
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"

)

const   PRODUCER1 = "SUPPLIER1"
const 	PRODUCER2 = "SUPPLIER2"
const   SHIPPING = "SHIPPINGCO"
const   RETAILER = "RETAILER"
const 	CONSUMER = "CONSUMER"
const 	CERTIFIER = "CERTIFIER"

// SimpleChaincode example simple Chaincode implementation
type SimpleChaincode struct {
}

type Batch struct {
	Id   		string  `json:"id"`
	BType  		string  `json:"bType"`
	Owner  		string  `json:"owner"`
	Quantity	int 	`json:"quantity"`
	Quality	 	string 	`json:"quality"`
	Signature	string 	`json:"signature"`
	Transactions []Transaction `json:"transactions"`
}

type Transaction struct {
	BType  		string  `json:"bType"`
	Owner  		string  `json:"owner"`
	Quantity	int 	`json:"quantity"`
	Quality	 	string 	`json:"quality"`
	Signature	string 	`json:"signature"`
	VDate 		string   `json:"vDate"`
	Location  	string   `json:"location"`
	TType 		string   `json:"ttype"`
}

type AllBatches struct{
	Batches []string `json:"batches"`
}

type AllBatchesDetails struct{
	Batches []Batch `json:"batches"`
}

// ============================================================================================================================
// Init
// ============================================================================================================================
func (t *SimpleChaincode) Init(stub  shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {

	var err error

	var batches AllBatches
	jsonAsBytes, _ := json.Marshal(batches)
	err = stub.PutState("allBatches", jsonAsBytes)
	if err != nil {
		return nil, err
	}

	return nil, nil
}

// ============================================================================================================================
// Run - Our entry point for Invocations - [LEGACY] obc-peer 4/25/2016
// ============================================================================================================================
func (t *SimpleChaincode) Run(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	fmt.Println("run is running " + function)
	return t.Invoke(stub, function, args)
}



// ============================================================================================================================
// Run - Our entry point
// ============================================================================================================================
func (t *SimpleChaincode) Invoke(stub  shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	fmt.Println("Run is running " + function)

	// Handle different functions
	if function == "init" {													//initialize the chaincode state
		return t.Init(stub, "init", args)
	} else if function == "createBatch" {											//create a batch
		return t.createBatch(stub, args)
	} else if function == "claimBatch" {											//claim ownership of a batch
		return t.claimBatch(stub, args)
	} else if function == "transferBatch" {											//transfer ownership of a batch
		return t.transferBatch(stub, args)
	} else if function == "sellBatchItem" {											//sell a batch item
		return t.sellBatchItem(stub, args)
	} else if function == "updateBatchQuality" {									//update batch quality
		return t.updateBatchQuality(stub, args)
	}
	fmt.Println("run did not find func: " + function)						//error

	return nil, errors.New("Received unknown function invocation")
}

// ============================================================================================================================
// Query - read a variable from chaincode state - (aka read)
// ============================================================================================================================
func (t *SimpleChaincode) Query(stub  shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {

	if len(args) != 1 { return nil, errors.New("Incorrect number of arguments passed") }

	if function != "getBatch" && function != "getAllBatches" && function != "getAllBatchesDetails" && function != "getNbItems"{
		return nil, errors.New("Invalid query function name.")
	}

	if function == "getBatch" { return t.getBatch(stub, args[0]) }
	if function == "getAllBatches" { return t.getAllBatches(stub, args[0]) }
	if function == "getAllBatchesDetails" { return t.getAllBatchesDetails(stub, args[0]) }
	if function == "getNbItems" { return t.getNbItems(stub, args[0]) }

	return nil, nil
}


// ============================================================================================================================
// Get Batch Details
// ============================================================================================================================
func (t *SimpleChaincode) getBatch(stub  shim.ChaincodeStubInterface, batchId string)([]byte, error){

	fmt.Println("Start find Batch")
	fmt.Println("Looking for Batch #" + batchId);

	//get the batch index
	bAsBytes, err := stub.GetState(batchId)
	if err != nil {
		return nil, errors.New("Failed to get Batch #" + batchId)
	}

	return bAsBytes, nil

}


// ============================================================================================================================
// Get All Batches
// ============================================================================================================================
func (t *SimpleChaincode) getAllBatches(stub  shim.ChaincodeStubInterface, user string)([]byte, error){

	fmt.Println("Start find getAllBatches ")
	fmt.Println("Looking for All Batches " + user);

	//get the AllBatches index
	allBAsBytes, err := stub.GetState("allBatches")
	if err != nil {
		return nil, errors.New("Failed to get all Batches")
	}

	var res AllBatches
	err = json.Unmarshal(allBAsBytes, &res)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal all Batches")
	}

	var rab AllBatches

	for i := range res.Batches{

		sbAsBytes, err := stub.GetState(res.Batches[i])
		if err != nil {
			return nil, errors.New("Failed to get Batch")
		}
		var sb Batch
		json.Unmarshal(sbAsBytes, &sb)

		if(user == CERTIFIER) {
			rab.Batches = append(rab.Batches,sb.Id);
		}else{
			for j := range sb.Transactions{
				var _owner = sb.Transactions[j].Owner
				if (user == _owner){
					rab.Batches = append(rab.Batches,sb.Id);
					break;
				}
			}
		}
	}

	rabAsBytes, _ := json.Marshal(rab)

	return rabAsBytes, nil

}


// ============================================================================================================================
// Get All Batches Details for a specific user
// ============================================================================================================================
func (t *SimpleChaincode) getAllBatchesDetails(stub  shim.ChaincodeStubInterface, user string)([]byte, error){

	fmt.Println("Start find getAllBatchesDetails ")
	fmt.Println("Looking for All Batches Details " + user);

	//get the AllBatches index
	allBAsBytes, err := stub.GetState("allBatches")
	if err != nil {
		return nil, errors.New("Failed to get all Batches")
	}

	var res AllBatches
	err = json.Unmarshal(allBAsBytes, &res)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal all Batches")
	}

	var rab AllBatchesDetails

	for i := range res.Batches{

		sbAsBytes, err := stub.GetState(res.Batches[i])
		if err != nil {
			return nil, errors.New("Failed to get Batch")
		}
		var sb Batch
		json.Unmarshal(sbAsBytes, &sb)

		if(sb.Owner == user) {
			sb.Transactions = nil
			sb.Signature = ""
			rab.Batches = append(rab.Batches,sb);
		}

	}

	rabAsBytes, _ := json.Marshal(rab)

	return rabAsBytes, nil

}

// ============================================================================================================================
// Get Total Number of Items
// ============================================================================================================================
func (t *SimpleChaincode) getNbItems(stub  shim.ChaincodeStubInterface, user string)([]byte, error){

	fmt.Println("Start find getTotNbItems ")
	fmt.Println("Looking for Total Number of Items " + user);

	//get the AllBatches index
	allBAsBytes, err := stub.GetState("allBatches")
	if err != nil {
		return nil, errors.New("Failed to get all Batches")
	}

	var res AllBatches
	err = json.Unmarshal(allBAsBytes, &res)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal all Batches")
	}

	nbItems:=0

	for i := range res.Batches{

		sbAsBytes, err := stub.GetState(res.Batches[i])
		if err != nil {
			return nil, errors.New("Failed to get Batch")
		}
		var sb Batch
		json.Unmarshal(sbAsBytes, &sb)

		if(sb.Owner == user) {
			nbItems=nbItems+sb.Quantity;
		}

	}

	resAsBytes, _ := json.Marshal(nbItems)

	return resAsBytes, nil

}


// ============================================================================================================================
// Create new Batch of Items
// type Batch struct {
// 	Id   		string  `json:"id"`
// 	BType  		string  `json:"bType"`
// 	Owner  		string  `json:"owner"`
// 	Quantity	int 	`json:"quantity"`
// 	Quality	 	string 	`json:"quality"`
// 	Signature	string 	`json:"signature"`
// 	Transactions []Transaction `json:"transactions"`
// }

// type Transaction struct {
// 	VDate 		string   `json:"vDate"`
// 	Location  	string   `json:"location"`
// 	TType 		string   `json:"ttype"`
// }
// ============================================================================================================================
func (t *SimpleChaincode) createBatch(stub  shim.ChaincodeStubInterface, args []string) ([]byte, error) {

	var err error
	fmt.Println("Running createBatch")

	if len(args) != 6 {
		fmt.Println("Incorrect number of arguments. Expecting 6")
		return nil, errors.New("Incorrect number of arguments. Expecting 6")
	}

	
	if (args[2] != PRODUCER1)&&(args[2] != PRODUCER2)  {
		fmt.Println("You are not allowed to create a new batch")
		return nil, errors.New("You are not allowed to create a new batch")
	}

	var bt Batch
	bt.Id 			= args[0]
	bt.BType		= args[1]
	bt.Owner		= args[2]
	quantityValue, err := strconv.Atoi(args[3])
	if err != nil { return nil, errors.New("Invalid Quantity")}
	if(quantityValue < 1) {return nil, errors.New("Quantity should be at least equal to 1")}
	bt.Quantity = quantityValue
	bt.Quality 		= "OK"
	bt.Signature 	= ""

	var tx Transaction
	tx.VDate		= args[4]
	tx.Location 	= args[5]
	tx.TType 		= "CREATE"
	tx.BType 		= bt.BType
	tx.Owner 		= bt.Owner
	tx.Quantity		= bt.Quantity
	tx.Quality 		= bt.Quality
	tx.Signature 	= bt.Signature

	bt.Transactions = append(bt.Transactions, tx)

	//Commit batch to ledger
	fmt.Println("createBatch Commit Batch To Ledger");
	btAsBytes, _ := json.Marshal(bt)
	err = stub.PutState(bt.Id, btAsBytes)
	if err != nil {
		return nil, err
	}

	//Update All Batches Array
	allBAsBytes, err := stub.GetState("allBatches")
	if err != nil {
		return nil, errors.New("Failed to get all Batches")
	}
	var allb AllBatches
	err = json.Unmarshal(allBAsBytes, &allb)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal all Batches")
	}
	allb.Batches = append(allb.Batches,bt.Id)

	allBuAsBytes, _ := json.Marshal(allb)
	err = stub.PutState("allBatches", allBuAsBytes)
	if err != nil {
		return nil, err
	}

	return nil, nil
}


// ============================================================================================================================
// Claim a batch - can only be done by shipping company
// ============================================================================================================================
func (t *SimpleChaincode) claimBatch(stub  shim.ChaincodeStubInterface, args []string) ([]byte, error) {

	var err error
	fmt.Println("Running claimBatch")

	if len(args) != 4 {
		fmt.Println("Incorrect number of arguments. Expecting 4 (BatchId, user, date, location)")
		return nil, errors.New("Incorrect number of arguments. Expecting 4")
	}

	if args[1] != SHIPPING { return nil, errors.New("You are not allowed to claim a batch") }

	//Update Batch owner
	bAsBytes, err := stub.GetState(args[0])
	if err != nil {
		return nil, errors.New("Failed to get Batch #" + args[0])
	}
	var bch Batch
	err = json.Unmarshal(bAsBytes, &bch)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal Batch #" + args[0])
	}
	bch.Owner = args[1]

	var tx Transaction
	tx.VDate		= args[2]
	tx.Location 	= args[3]
	tx.TType 		= "CLAIM"
	tx.BType 		= bch.BType
	tx.Owner 		= bch.Owner
	tx.Quantity		= bch.Quantity
	tx.Quality 		= bch.Quality
	tx.Signature 	= bch.Signature

	bch.Transactions = append(bch.Transactions, tx)

	//Commit updates batch to ledger
	fmt.Println("claimBatch Commit Updates To Ledger");
	btAsBytes, _ := json.Marshal(bch)
	err = stub.PutState(bch.Id, btAsBytes)
	if err != nil {
		return nil, err
	}

	return nil, nil
}

// ============================================================================================================================
// Transfer a batch - can only be done by shipping company
// ============================================================================================================================
func (t *SimpleChaincode) transferBatch(stub  shim.ChaincodeStubInterface, args []string) ([]byte, error) {

	var err error
	fmt.Println("Running transferBatch")

	if len(args) != 6 {
		fmt.Println("Incorrect number of arguments. Expecting 6 (BatchId, user, date, location, newOwner, signature)")
		return nil, errors.New("Incorrect number of arguments. Expecting 6")
	}

	if args[1] != SHIPPING { return nil, errors.New("You are not allowed to transfer a batch") }

	//Update Batch data
	bAsBytes, err := stub.GetState(args[0])
	if err != nil {
		return nil, errors.New("Failed to get Batch #" + args[0])
	}
	var bch Batch
	err = json.Unmarshal(bAsBytes, &bch)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal Batch #" + args[0])
	}
	bch.Owner = args[4]
	bch.Signature = args[5]

	var tx Transaction
	tx.VDate		= args[2]
	tx.Location 	= args[3]
	tx.TType 		= "TRANSFER"
	tx.BType 		= bch.BType
	tx.Owner 		= bch.Owner
	tx.Quantity		= bch.Quantity
	tx.Quality 		= bch.Quality
	tx.Signature 	= bch.Signature

	bch.Transactions = append(bch.Transactions, tx)

	//Commit updates batch to ledger
	fmt.Println("transferBatch Commit Updates To Ledger");
	btAsBytes, _ := json.Marshal(bch)
	err = stub.PutState(bch.Id, btAsBytes)
	if err != nil {
		return nil, err
	}

	return nil, nil
}


// ============================================================================================================================
// Sell batch item - can only be done by retailer (it changes the quantity in the batch object)
// ============================================================================================================================
func (t *SimpleChaincode) sellBatchItem(stub  shim.ChaincodeStubInterface, args []string) ([]byte, error) {

	var err error
	fmt.Println("Running sellBatchItem")

	if len(args) != 6 {
		fmt.Println("Incorrect number of arguments. Expecting 6 (BatchId, user, date, location, quantity, newOwner)")
		return nil, errors.New("Incorrect number of arguments. Expecting 6")
	}

	if args[1] != RETAILER { return nil, errors.New("You are not allowed to sell a batch item") }

	//Update Batch data
	bAsBytes, err := stub.GetState(args[0])
	if err != nil {
		return nil, errors.New("Failed to get Batch #" + args[0])
	}
	var bch Batch
	err = json.Unmarshal(bAsBytes, &bch)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal Batch #" + args[0])
	}

	quantityValue, err := strconv.Atoi(args[4])
	if err != nil { return nil, errors.New("Invalid Quantity")}
	if(bch.Quantity-quantityValue < 0) { return nil, errors.New("You can't sell "+ args[4] + " items from this batch") }

	bch.Quantity = bch.Quantity-quantityValue

	var tx Transaction
	tx.VDate		= args[2]
	tx.Location 	= args[3]
	tx.TType 		= "SELL"
	tx.BType 		= bch.BType
	tx.Owner 		= args[5]
	tx.Quantity		= quantityValue
	tx.Quality 		= bch.Quality
	tx.Signature 	= ""

	if(bch.Quantity == 0){
		bch.Owner = "N/A"
	}

	bch.Transactions = append(bch.Transactions, tx)

	//Commit updates batch to ledger
	fmt.Println("sellBatchItem Commit Updates To Ledger");
	btAsBytes, _ := json.Marshal(bch)
	err = stub.PutState(bch.Id, btAsBytes)
	if err != nil {
		return nil, err
	}

	return nil, nil
}


// ============================================================================================================================
// Update batch quality - this is done through the shipping company via IOT (if the temperature of food truck is above a certain value it will call this method)
// ============================================================================================================================
func (t *SimpleChaincode) updateBatchQuality(stub shim.ChaincodeStubInterface, args []string) ([]byte, error) {

	var err error
	fmt.Println("Running updateBatchQuality")

	if len(args) != 4 {
		fmt.Println("Incorrect number of arguments. Expecting 4 (user, date, location, message)")
		return nil, errors.New("Incorrect number of arguments. Expecting 4")
	}

	if args[0] != SHIPPING { return nil, errors.New("You are not allowed to update batch quality") }

	//get the AllBatches index
	allBAsBytes, err := stub.GetState("allBatches")
	if err != nil {
		return nil, errors.New("Failed to get all Batches")
	}

	var res AllBatches
	err = json.Unmarshal(allBAsBytes, &res)
	if err != nil {
		return nil, errors.New("Failed to Unmarshal all Batches")
	}

	for i := range res.Batches{

		sbAsBytes, err := stub.GetState(res.Batches[i])
		if err != nil {
			return nil, errors.New("Failed to get Batch")
		}
		var sb Batch
		json.Unmarshal(sbAsBytes, &sb)

		if(sb.Owner == args[0]) {
			sb.Quality = args[3];

			var tx Transaction
			tx.VDate		= args[1]
			tx.Location 	= args[2]
			tx.TType 		= "UPDATE QUALITY"
			tx.BType 		= sb.BType
			tx.Owner 		= sb.Owner
			tx.Quantity		= sb.Quantity
			tx.Quality 		= sb.Quality
			tx.Signature 	= sb.Signature

			sb.Transactions = append(sb.Transactions, tx)


			//Commit updates batch to ledger
			fmt.Println("updateBatchQuality Commit Updates To Ledger");
			btAsBytes, _ := json.Marshal(sb)
			err = stub.PutState(sb.Id, btAsBytes)
			if err != nil {
				return nil, err
			}
		}
	}

	return nil, nil
}

// ============================================================================================================================
// Containte function
// ============================================================================================================================

func contains(slice [2]string, item string) bool {
    for _, s := range slice {
		if(s==item){
	    	return true
		}
    }
	return false
}

// ============================================================================================================================
// Main function
// ============================================================================================================================

func main() {
	err := shim.Start(new(SimpleChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}