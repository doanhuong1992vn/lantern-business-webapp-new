package com.lantern_business_webapp.controller.authenticated;

import com.lantern_business_webapp.payload.request.ProductRequestDTO;
import com.lantern_business_webapp.payload.response.ProductResponseDTO;
import com.lantern_business_webapp.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@RestController
@RequiredArgsConstructor
@CrossOrigin("*")
@RequestMapping("/api/auth/products")
public class AuthProductController {
    private final ProductService productService;

    @PostMapping
    public ResponseEntity<?> save(
            @Valid @RequestBody ProductRequestDTO productRequestDTO, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return new ResponseEntity<>(bindingResult.getAllErrors(), HttpStatus.BAD_REQUEST);
        }
        ProductResponseDTO productResponseDTO = productService.save(productRequestDTO);
        return new ResponseEntity<>(productResponseDTO, HttpStatus.CREATED);
    }

    @PutMapping
    public ResponseEntity<?> update(
            @Valid @RequestBody ProductRequestDTO productRequestDTO, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return new ResponseEntity<>(bindingResult.getAllErrors(), HttpStatus.BAD_REQUEST);
        }
        ProductResponseDTO productResponseDTO = productService.save(productRequestDTO);
        return new ResponseEntity<>(productResponseDTO, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable @NotNull @NotBlank String id) {
        ProductResponseDTO productResponseDTO = productService.findById(id);
        if (productResponseDTO == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } else {
            productService.delete(id);
            return new ResponseEntity<>(HttpStatus.OK);
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> setShown(@PathVariable @NotNull @NotBlank String id, @RequestBody Boolean isShow) {
        ProductResponseDTO productResponseDTO = productService.setShown(id, isShow);
        return productResponseDTO == null
                ? new ResponseEntity<>(HttpStatus.NOT_FOUND)
                : new ResponseEntity<>(HttpStatus.OK);
    }

}
