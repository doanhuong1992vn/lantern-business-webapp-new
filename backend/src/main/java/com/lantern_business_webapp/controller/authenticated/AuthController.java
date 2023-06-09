package com.lantern_business_webapp.controller.authenticated;

import com.lantern_business_webapp.entity.User;
import com.lantern_business_webapp.exception.DuplicateFieldUserException;
import com.lantern_business_webapp.payload.request.LoginRequestDTO;
import com.lantern_business_webapp.payload.request.RegisterRequestDTO;
import com.lantern_business_webapp.payload.response.LoginResponseDTO;
import com.lantern_business_webapp.payload.response.MessageResponseDTO;
import com.lantern_business_webapp.security.JwtTokenProvider;
import com.lantern_business_webapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.BindingResult;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;


@RestController
@RequiredArgsConstructor
@CrossOrigin("*")
@RequestMapping("/api")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequestDTO loginRequestDTO) {
        try {
            // Gọi hàm authenticate để xác thực thông tin đăng nhập
            Authentication authentication = authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(
                            loginRequestDTO.getUsername(), loginRequestDTO.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Gọi hàm tạo Token
            String token = tokenProvider.generateToken(authentication);
            User user = userService.findByUsername(loginRequestDTO.getUsername());
            return new ResponseEntity<>(new LoginResponseDTO(
                    "Đăng nhập thành công!", user.getFullName(), user.getRoles(), token),
                    HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(new LoginResponseDTO(
                    "Đăng nhập thất bại!", null), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequestDTO registerRequestDTO,
            BindingResult bindingResult) throws DuplicateFieldUserException {
        if (bindingResult.hasErrors()) {
            bindingResult.addError(new ObjectError(
                    "reject-message", "Thông tin đăng ký không hợp lệ!"));
            return new ResponseEntity<>(bindingResult, HttpStatus.BAD_REQUEST);
        }
        User user = userService.save(registerRequestDTO);
        if (user == null) {
            return new ResponseEntity<>(new MessageResponseDTO(
                    "Tạo tài khoản thất bại! Lỗi này Hưởng chưa handle :)))"), HttpStatus.NOT_IMPLEMENTED);
            //501 Not Implemented: Server không công nhận các Request method hoặc không có khả năng xử lý nó.
        }
        return new ResponseEntity<>(new MessageResponseDTO(
                String.format("Chúc mừng %s đã tạo tài khoản thành công với username %s",
                        registerRequestDTO.getFullName(), registerRequestDTO.getUsername())),
                HttpStatus.CREATED);
    }
}
